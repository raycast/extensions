import { useState, useEffect } from "react";
import { ActionPanel, List, Action, Icon, Color } from "@raycast/api";
import { Client } from "@notionhq/client";
import { PageObjectResponse } from "@notionhq/client/build/src/api-endpoints";
import { formatDate, isDateInRange, groupByDate } from "./utils";
import { getConfig } from "./config";

// Get configuration from Raycast preferences
const { notionApiKey, notionDatabaseId } = getConfig();

// Initialize Notion client with the API key from preferences
const notion = new Client({
  auth: notionApiKey,
});

export interface Employee {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  status: string;
  reason: string;
  workTag: string;
  notionUrl: string;
}

export default function Command() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchEmployees() {
      try {
        const response = await notion.databases.query({
          database_id: notionDatabaseId,
          filter: {
            and: [
              {
                property: "Status",
                status: {
                  does_not_equal: "Rejected",
                },
              },
            ],
          },
        });

        const employeeData = response.results
          .filter((page): page is PageObjectResponse => "properties" in page)
          .map((page) => {
            const properties = page.properties;

            return {
              id: page.id,
              name:
                properties["Employee Name"]?.type === "title"
                  ? properties["Employee Name"].title[0]?.plain_text || "Unnamed"
                  : "Unnamed",
              startDate: properties["Start Date"]?.type === "date" ? properties["Start Date"].date?.start || "" : "",
              endDate: properties["End Date"]?.type === "date" ? properties["End Date"].date?.start || "" : "",
              status:
                properties["Status"]?.type === "status" ? properties["Status"].status?.name || "Unknown" : "Unknown",
              reason:
                properties["Reason"]?.type === "rich_text" ? properties["Reason"].rich_text[0]?.plain_text || "" : "",
              workTag: properties["Work Tag"]?.type === "select" ? properties["Work Tag"].select?.name || "" : "",
              notionUrl: page.url || "",
            };
          });

        // Extra filter to ensure no rejected entries
        const filteredData = employeeData.filter((employee) => employee.status !== "Rejected");
        setEmployees(filteredData);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchEmployees();
  }, []);

  // Calculate work days (excluding weekends)
  function getWorkDays(startDateStr: string, endDateStr: string): number {
    const startDate = new Date(startDateStr);
    const endDate = new Date(endDateStr);

    // Set time to beginning of day for accurate calculation
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(0, 0, 0, 0);

    let workDays = 0;
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      // 0 = Sunday, 6 = Saturday
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workDays++;
      }

      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return workDays;
  }

  const today = new Date();
  const todayStr = formatDate(today);
  const employeesOnLeaveToday = employees.filter((employee) =>
    isDateInRange(todayStr, employee.startDate, employee.endDate),
  );

  // Handle when no data or loading state
  if (isLoading) {
    return <List isLoading={true} searchBarPlaceholder="Search employees on leave..." />;
  }

  // If no records in upcoming leaves and no one on leave today
  if (employees.length === 0) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Person}
          title="No leave records found"
          description="No leave data available. Check your Notion database connection and preferences."
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title="Setup Notion Integration" url="https://www.notion.so/my-integrations" />
            </ActionPanel>
          }
        />
      </List>
    );
  }

  // Group upcoming leaves by start date
  const upcomingLeaves = employees
    .filter((employee) => new Date(employee.startDate) > today)
    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

  const groupedUpcomingLeaves = groupByDate(upcomingLeaves);

  // Filter employees based on status if needed
  const filteredEmployees =
    statusFilter !== "all" ? employeesOnLeaveToday.filter((emp) => emp.status === statusFilter) : employeesOnLeaveToday;

  return (
    <List
      searchBarPlaceholder="Search employees on leave..."
      searchBarAccessory={
        <List.Dropdown tooltip="Filter by Status" value={statusFilter} onChange={setStatusFilter}>
          <List.Dropdown.Item title="All Statuses" value="all" />
          <List.Dropdown.Item title="Approved" value="Approved" />
          <List.Dropdown.Item title="Pending" value="Pending" />
        </List.Dropdown>
      }
    >
      {filteredEmployees.length > 0 ? (
        <List.Section title="📅 Employees On Leave Today">
          {filteredEmployees.map((employee) => (
            <List.Item
              key={employee.id}
              icon={{ source: Icon.Person }}
              title={employee.name || "Unnamed"}
              subtitle={`📅 ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)}`}
              accessories={[
                {
                  tag: {
                    value: `${getWorkDays(employee.startDate, employee.endDate)} Werktage`,
                    color: Color.Black,
                  },
                },
                {
                  text: employee.reason || "",
                  icon: employee.reason.toLowerCase() === "urlaub" ? { source: "😎" } : undefined,
                },
                getStatusAccessory(employee.status),
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Show Details"
                    target={
                      <List>
                        <List.Section title={`Leave Details for ${employee.name}`}>
                          <List.Item
                            icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                            title="Leave Period"
                            subtitle={`${formatDate(employee.startDate)} - ${formatDate(employee.endDate)}`}
                          />
                          <List.Item
                            icon={{ source: Icon.Clock, tintColor: Color.Purple }}
                            title="Work Days"
                            subtitle={`${getWorkDays(employee.startDate, employee.endDate)} Werktage`}
                          />
                          <List.Item
                            icon={
                              employee.reason.toLowerCase() === "urlaub"
                                ? { source: "😎" }
                                : { source: Icon.Message, tintColor: Color.Green }
                            }
                            title="Reason"
                            subtitle={employee.reason}
                          />
                          <List.Item
                            icon={{
                              source: employee.status === "Approved" ? Icon.CheckCircle : Icon.Clock,
                              tintColor: employee.status === "Approved" ? Color.Green : Color.Orange,
                            }}
                            title="Status"
                            subtitle={employee.status}
                          />
                          {employee.workTag && (
                            <List.Item
                              icon={{ source: Icon.Building, tintColor: Color.Brown }}
                              title="Department"
                              subtitle={employee.workTag}
                            />
                          )}
                        </List.Section>
                        <List.Section title="Actions">
                          <List.Item
                            icon={{ source: Icon.Link, tintColor: Color.Blue }}
                            title="Open in Notion"
                            actions={
                              <ActionPanel>
                                <Action.OpenInBrowser url={employee.notionUrl || "#"} />
                              </ActionPanel>
                            }
                          />
                          <List.Item
                            icon={{ source: Icon.CopyClipboard, tintColor: Color.Blue }}
                            title="Copy Leave Details"
                            actions={
                              <ActionPanel>
                                <Action.CopyToClipboard
                                  content={`${employee.name}: ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)} (${getWorkDays(employee.startDate, employee.endDate)} Werktage) - ${employee.reason}`}
                                />
                              </ActionPanel>
                            }
                          />
                        </List.Section>
                      </List>
                    }
                  />
                  <Action.OpenInBrowser title="Open in Notion" url={employee.notionUrl || "#"} />
                  <Action.CopyToClipboard
                    title="Copy Leave Details"
                    content={`${employee.name}: ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)} (${getWorkDays(employee.startDate, employee.endDate)} Werktage) - ${employee.reason}`}
                    shortcut={{ modifiers: ["cmd"], key: "c" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      ) : (
        <List.EmptyView
          icon={Icon.Person}
          title="No employees on leave today"
          description="Everyone is at work today! 🎉"
        />
      )}

      {Object.entries(groupedUpcomingLeaves).map(([date, employees]) => {
        // Filter employees based on status if needed
        const filteredEmployeesByDate =
          statusFilter !== "all" ? employees.filter((emp) => emp.status === statusFilter) : employees;

        if (filteredEmployeesByDate.length === 0) return null;

        return (
          <List.Section key={date} title={`📆 Off from ${date}`}>
            {filteredEmployeesByDate.map((employee) => (
              <List.Item
                key={employee.id}
                icon={{ source: Icon.Person }}
                title={employee.name || "Unnamed"}
                subtitle={`📅 ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)}`}
                accessories={[
                  {
                    tag: {
                      value: `${getWorkDays(employee.startDate, employee.endDate)} Werktage`,
                      color: Color.Black,
                    },
                  },
                  {
                    text: employee.reason || "",
                    icon: employee.reason.toLowerCase() === "urlaub" ? { source: "😎" } : undefined,
                  },
                  getStatusAccessory(employee.status),
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="Show Details"
                      target={
                        <List>
                          <List.Section title={`Leave Details for ${employee.name}`}>
                            <List.Item
                              icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                              title="Leave Period"
                              subtitle={`${formatDate(employee.startDate)} - ${formatDate(employee.endDate)}`}
                            />
                            <List.Item
                              icon={{ source: Icon.Clock, tintColor: Color.Purple }}
                              title="Work Days"
                              subtitle={`${getWorkDays(employee.startDate, employee.endDate)} Werktage`}
                            />
                            <List.Item
                              icon={
                                employee.reason.toLowerCase() === "urlaub"
                                  ? { source: "😎" }
                                  : { source: Icon.Message, tintColor: Color.Green }
                              }
                              title="Reason"
                              subtitle={employee.reason}
                            />
                            <List.Item
                              icon={{
                                source: employee.status === "Approved" ? Icon.CheckCircle : Icon.Clock,
                                tintColor: employee.status === "Approved" ? Color.Green : Color.Orange,
                              }}
                              title="Status"
                              subtitle={employee.status}
                            />
                            {employee.workTag && (
                              <List.Item
                                icon={{ source: Icon.Building, tintColor: Color.Brown }}
                                title="Department"
                                subtitle={employee.workTag}
                              />
                            )}
                          </List.Section>
                          <List.Section title="Actions">
                            <List.Item
                              icon={{ source: Icon.Link, tintColor: Color.Blue }}
                              title="Open in Notion"
                              actions={
                                <ActionPanel>
                                  <Action.OpenInBrowser url={employee.notionUrl || "#"} />
                                </ActionPanel>
                              }
                            />
                            <List.Item
                              icon={{ source: Icon.CopyClipboard, tintColor: Color.Blue }}
                              title="Copy Leave Details"
                              actions={
                                <ActionPanel>
                                  <Action.CopyToClipboard
                                    content={`${employee.name}: ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)} (${getWorkDays(employee.startDate, employee.endDate)} Werktage) - ${employee.reason}`}
                                  />
                                </ActionPanel>
                              }
                            />
                          </List.Section>
                        </List>
                      }
                    />
                    <Action.OpenInBrowser title="Open in Notion" url={employee.notionUrl || "#"} />
                    <Action.CopyToClipboard
                      title="Copy Leave Details"
                      content={`${employee.name}: ${formatDate(employee.startDate)} - ${formatDate(employee.endDate)} (${getWorkDays(employee.startDate, employee.endDate)} Werktage) - ${employee.reason}`}
                      shortcut={{ modifiers: ["cmd"], key: "c" }}
                    />
                  </ActionPanel>
                }
              />
            ))}
          </List.Section>
        );
      })}
    </List>
  );
}

function getStatusAccessory(status: string): List.Item.Accessory {
  switch (status) {
    case "Approved":
      return {
        text: status,
        icon: { source: Icon.CheckCircle, tintColor: Color.Green },
        tooltip: "Approved",
      };
    case "Pending":
      return {
        text: status,
        icon: { source: Icon.Clock, tintColor: Color.Orange },
        tooltip: "Pending",
      };
    case "Rejected":
      return {
        text: status,
        icon: { source: Icon.XmarkCircle, tintColor: Color.Red },
        tooltip: "Rejected",
      };
    default:
      return { text: status };
  }
}
