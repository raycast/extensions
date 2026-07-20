import { Form, ActionPanel, Action, showToast, LocalStorage } from "@raycast/api";
import { useState, useEffect } from "react";
import { useForm } from "@raycast/utils";
import { getContacts, getAdministrationId, getProjects, getUsers, createTimeEntry } from "./oauth/moneybird";
import { MoneybirdApiProject, MoneybirdUser, MoneybirdApiCustomer } from "./types/moneybird";
import { cacheKey, loadCachedList, saveCachedList } from "./lib/cache";
import { saveLastTimeEntry } from "./lib/last-time-entry";

interface FormValues {
  description: string;
  customerId: string;
  projectId: string;
  userId: string;
  startDate: Date;
  endDate: Date;
}

type RecordHoursFormProps = {
  initialValues?: Partial<FormValues>;
  useStartTime?: boolean;
};

export default function RecordHoursForm({ initialValues, useStartTime = true }: RecordHoursFormProps) {
  const initialStartDate = initialValues?.startDate ?? new Date();
  const initialEndDate = initialValues?.endDate ?? new Date();
  const shouldApplyStartTime = useStartTime && !initialValues?.startDate;

  const [isLoading, setIsLoading] = useState(true);
  const [customers, setCustomers] = useState<MoneybirdApiCustomer[]>([]);
  const [projects, setProjects] = useState<MoneybirdApiProject[]>([]);
  const [users, setUsers] = useState<MoneybirdUser[]>([]);
  const [administrationId, setAdministrationId] = useState<string | null>(null);

  const [startDate, setStartDate] = useState<Date>(initialStartDate);
  const [endDate, setEndDate] = useState<Date>(initialEndDate);

  useEffect(() => {
    if (!shouldApplyStartTime) return;

    async function loadStartTime() {
      const storedTime = await LocalStorage.getItem<string>("startTime");
      if (storedTime) {
        const date = new Date(storedTime);
        setStartDate(date);
      }
    }
    loadStartTime();
  }, [shouldApplyStartTime]);

  const { handleSubmit, itemProps, setValue } = useForm<FormValues>({
    initialValues: {
      description: initialValues?.description ?? "",
      customerId: initialValues?.customerId ?? "",
      projectId: initialValues?.projectId ?? "",
      userId: initialValues?.userId ?? "",
      startDate: initialStartDate,
      endDate: initialEndDate,
    },
    validation: {
      description: (value) => {
        if (!value || value.length === 0) return "Description is required";
      },
      startDate: (value) => {
        if (!value) return "Start date is required";
      },
      endDate: (value) => {
        if (!value) return "End date is required";
      },
      customerId: (value) => {
        if (!value || value.length === 0) return "Customer is required";
      },
    },
    onSubmit: async (values) => {
      try {
        setIsLoading(true);

        const resolvedAdministrationId = await resolveAdministrationId();
        await createTimeEntry(resolvedAdministrationId, {
          started_at: startDate.toISOString(),
          ended_at: endDate.toISOString(),
          project_id: values.projectId,
          customer_id: values.customerId,
          user_id: values.userId,
          description: values.description,
        });

        await saveLastTimeEntry({
          description: values.description,
          customerId: values.customerId,
          projectId: values.projectId,
          userId: values.userId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        });

        showToast({ title: "Success", message: "Time entry created" });
        setValue("description", "");
        setValue("customerId", "");
        setValue("projectId", "");
        setValue("userId", "");
        setValue("startDate", new Date());
        setValue("endDate", new Date());

        // Clear the start time from storage after successful submission
        await LocalStorage.removeItem("startTime");
      } catch (error) {
        console.error(error);
        showToast({ title: "Error", message: "Failed to create time entry" });
      } finally {
        setIsLoading(false);
      }
    },
  });

  const resolveAdministrationId = async () => {
    if (administrationId) return administrationId;
    const resolvedId = await getAdministrationId();
    setAdministrationId(resolvedId);
    return resolvedId;
  };

  const hydrateFromCache = async (resolvedAdministrationId: string) => {
    const [cachedCustomers, cachedProjects] = await Promise.all([
      loadCachedList<MoneybirdApiCustomer>(cacheKey(resolvedAdministrationId, "contacts")),
      loadCachedList<MoneybirdApiProject>(cacheKey(resolvedAdministrationId, "projects")),
    ]);

    if (cachedCustomers) setCustomers(cachedCustomers);
    if (cachedProjects) setProjects(cachedProjects);
    if (cachedCustomers || cachedProjects) setIsLoading(false);
  };

  const refreshAll = async (resolvedAdministrationId: string) => {
    const [fetchedCustomers, fetchedProjects, fetchedUsers] = await Promise.all([
      getContacts(resolvedAdministrationId),
      getProjects(resolvedAdministrationId),
      getUsers(resolvedAdministrationId),
    ]);

    setCustomers(fetchedCustomers);
    setProjects(fetchedProjects);
    setUsers(fetchedUsers);
    await Promise.all([
      saveCachedList(cacheKey(resolvedAdministrationId, "contacts"), fetchedCustomers),
      saveCachedList(cacheKey(resolvedAdministrationId, "projects"), fetchedProjects),
    ]);
  };

  useEffect(() => {
    async function fetchData() {
      try {
        const resolvedAdministrationId = await resolveAdministrationId();
        await hydrateFromCache(resolvedAdministrationId);
        await refreshAll(resolvedAdministrationId);
      } catch (error) {
        showToast({ title: "Error", message: "Failed to load data:" + error });
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  const refreshContacts = async () => {
    try {
      setIsLoading(true);
      const resolvedAdministrationId = await resolveAdministrationId();
      const refreshedCustomers = await getContacts(resolvedAdministrationId);
      setCustomers(refreshedCustomers);
      await saveCachedList(cacheKey(resolvedAdministrationId, "contacts"), refreshedCustomers);
      showToast({ title: "Contacts refreshed" });
    } catch (error) {
      showToast({ title: "Error", message: "Failed to refresh contacts:" + error });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshProjects = async () => {
    try {
      setIsLoading(true);
      const resolvedAdministrationId = await resolveAdministrationId();
      const refreshedProjects = await getProjects(resolvedAdministrationId);
      setProjects(refreshedProjects);
      await saveCachedList(cacheKey(resolvedAdministrationId, "projects"), refreshedProjects);
      showToast({ title: "Projects refreshed" });
    } catch (error) {
      showToast({ title: "Error", message: "Failed to refresh projects:" + error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form
      isLoading={isLoading}
      actions={
        <ActionPanel>
          <Action.SubmitForm onSubmit={handleSubmit} />
          <ActionPanel.Section>
            <Action title="Refresh Contacts" onAction={refreshContacts} />
            <Action title="Refresh Projects" onAction={refreshProjects} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    >
      <Form.TextField title="Description" placeholder="Enter description" {...itemProps.description} />
      <Form.DatePicker
        id="startDate"
        title="Start Date"
        value={startDate}
        onChange={(date) => {
          if (date) {
            setStartDate(date);
            setValue("startDate", date);
          }
        }}
      />
      <Form.DatePicker
        id="endDate"
        title="End Date"
        value={endDate}
        onChange={(date) => {
          if (date) {
            if (date < startDate) {
              showToast({
                title: "Error",
                message: "End date must be after start date",
              });
              return;
            }

            setEndDate(date);
            setValue("endDate", date);
          }
        }}
      />
      <Form.Separator />
      <Form.Dropdown title="Customer" isLoading={isLoading} {...itemProps.customerId}>
        {customers.map((customer) => (
          <Form.Dropdown.Item
            key={customer.id}
            value={customer.id}
            title={customer.company_name || `${customer.firstname} ${customer.lastname}`}
          />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="Project" isLoading={isLoading} {...itemProps.projectId}>
        {projects.map((project) => (
          <Form.Dropdown.Item key={project.id} value={project.id} title={project.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown title="User" isLoading={isLoading} {...itemProps.userId}>
        {users.map((user) => (
          <Form.Dropdown.Item key={user.id} value={user.id} title={user.name} />
        ))}
      </Form.Dropdown>
    </Form>
  );
}
