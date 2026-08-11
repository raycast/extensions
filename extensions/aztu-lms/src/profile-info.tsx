import { Action, ActionPanel, List, Toast, showToast, Icon, Color } from "@raycast/api";
import { getProfileInfo } from "./data/profile-info";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { getExamPassword } from "./data/exam-password";
import { LMS_BASE_URL } from "./lib/constants";

export default function Command() {
  const { isLoading, data: profile } = useCachedPromise(getProfileInfo, [], {
    initialData: null,
    onError: async () => {
      await showToast(Toast.Style.Failure, "Failed to fetch Profile Info");
    },
  });

  const { isLoading: isExamPasswordLoading, data: examPassword } = usePromise(getExamPassword, [], {
    onError: async () => {
      await showToast(Toast.Style.Failure, "Failed to fetch Exam Password");
    },
  });

  const basic = profile?.basicInfo;
  const academic = profile?.academicInfo;

  const getStatusColor = (status: string): Color => {
    if (status?.toLowerCase().includes("active") || status?.toLowerCase().includes("aktiv")) {
      return Color.Green;
    }
    return Color.Orange;
  };

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search profile information...">
      {profile && (
        <>
          {/* Profile Overview Card */}
          <List.Section title="👤 Profile Overview">
            <List.Item
              title={`${basic?.name} ${basic?.surname}`}
              subtitle={`Student ID: ${basic?.userId}`}
              icon={{
                source: Icon.Person,
                tintColor: Color.Blue,
              }}
              accessories={[
                {
                  text: academic?.status || "Unknown",
                  icon: {
                    source: Icon.Dot,
                    tintColor: getStatusColor(academic?.status || ""),
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Student ID"
                    content={basic?.userId || ""}
                    icon={Icon.CopyClipboard}
                  />
                </ActionPanel>
              }
            />
          </List.Section>

          {/* Quick Info Cards */}
          <List.Section title="📋 Personal Information">
            <List.Item
              title="Father's Name"
              subtitle={basic?.fatherName || "Not specified"}
              icon={{
                source: Icon.PersonLines,
                tintColor: Color.Blue,
              }}
              actions={
                basic?.fatherName && (
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Father's Name"
                      content={basic?.fatherName || ""}
                      icon={Icon.CopyClipboard}
                    />
                  </ActionPanel>
                )
              }
            />

            <List.Item
              title="Birth Date"
              subtitle={basic?.birthday || "Not specified"}
              icon={{
                source: Icon.Calendar,
                tintColor: Color.Purple,
              }}
              actions={
                basic?.birthday && (
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Birthday"
                      content={basic?.birthday || ""}
                      icon={Icon.CopyClipboard}
                    />
                  </ActionPanel>
                )
              }
            />

            <List.Item
              title="Gender"
              subtitle={basic?.gender || "Not specified"}
              icon={{
                source: Icon.PersonCircle,
                tintColor: Color.Orange,
              }}
            />

            <List.Item
              title="Phone"
              subtitle={basic?.phone || "Not specified"}
              icon={{
                source: Icon.Phone,
                tintColor: Color.Green,
              }}
              actions={
                basic?.phone && (
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Phone Number" content={basic.phone} icon={Icon.CopyClipboard} />
                  </ActionPanel>
                )
              }
            />

            <List.Item
              title="Mobile Phone"
              subtitle={basic?.mobilePhone || "Not specified"}
              icon={{
                source: Icon.Mobile,
                tintColor: Color.Green,
              }}
              actions={
                basic?.mobilePhone && (
                  <ActionPanel>
                    <Action.CopyToClipboard
                      title="Copy Mobile Number"
                      content={basic.mobilePhone}
                      icon={Icon.CopyClipboard}
                    />
                  </ActionPanel>
                )
              }
            />

            <List.Item
              title="Address"
              subtitle={basic?.address || "Not specified"}
              icon={{
                source: Icon.House,
                tintColor: Color.Red,
              }}
              actions={
                basic?.address && (
                  <ActionPanel>
                    <Action.CopyToClipboard title="Copy Address" content={basic.address} icon={Icon.CopyClipboard} />
                  </ActionPanel>
                )
              }
            />
          </List.Section>

          <List.Section title="🎓 Academic Information">
            <List.Item
              title="Course"
              subtitle={academic?.course || "Not specified"}
              icon={{
                source: Icon.Book,
                tintColor: Color.Purple,
              }}
            />

            <List.Item
              title="Education Type"
              subtitle={academic?.registerType || "Not specified"}
              icon={{
                source: Icon.Book,
                tintColor: Color.Blue,
              }}
            />
          </List.Section>

          {/* Exam Resources */}
          <List.Section title="📝 Exam Resources">
            <List.Item
              title="Test Exam Password"
              subtitle="Copy password for test exams"
              icon={{
                source: Icon.Lock,
                tintColor: Color.Yellow,
              }}
              accessories={[
                {
                  text: isExamPasswordLoading ? "Loading..." : examPassword ? examPassword.data.toString() : "—",
                  icon: Icon.Key,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.CopyToClipboard
                    title="Copy Password"
                    content={examPassword ? examPassword.data.toString() : "—"}
                    icon={Icon.Clipboard}
                  />
                </ActionPanel>
              }
            />

            <List.Item
              title="Oral Exam Portal"
              subtitle="Access your oral examination platform"
              icon={{
                source: Icon.Globe,
                tintColor: Color.Red,
              }}
              accessories={[
                {
                  text: "Open Portal",
                  icon: Icon.ArrowNe,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action.OpenInBrowser
                    title="Open Oral Exam Portal"
                    url={`${LMS_BASE_URL}/oralexams`}
                    icon={Icon.Globe}
                  />
                  <Action.CopyToClipboard
                    title="Copy Portal URL"
                    content={`${LMS_BASE_URL}/oralexams`}
                    icon={Icon.Link}
                  />
                </ActionPanel>
              }
            />
          </List.Section>
        </>
      )}

      <List.EmptyView
        icon={Icon.Person}
        title="No Profile Data"
        description="Unable to load your profile information. Please try again."
      />
    </List>
  );
}
