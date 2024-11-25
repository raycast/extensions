import { ActionPanel, Form, Action, useNavigation, showToast, Toast } from "@raycast/api";
import { useState, useCallback } from "react";
import { useCachedPromise } from "@raycast/utils";
import api from "./api";
import moment from "moment-timezone";

interface User {
  _id: string;
  firstName: string;
  lastName: string;
}

interface Oncall {
  _id: string;
  name: string;
}

interface FormState {
  oncall: string;
  user: string;
  desc: string;
  startDate: Date;
  endDate: Date;
}

interface ApiResponse {
  oncalls: Oncall[];
  users: User[];
}

interface CommandProps {
  oncallId?: string;
}

export default function Command({ oncallId }: CommandProps) {
  const { pop } = useNavigation();
  const [formState, setFormState] = useState<FormState>({
    oncall: oncallId || "",
    user: "",
    desc: "",
    startDate: moment().toDate(),
    endDate: moment().add(1, "day").toDate(),
  });

  const { data, isLoading } = useCachedPromise<() => Promise<ApiResponse>>(
    async () => {
      const [oncallData, userData] = await Promise.all([api.oncall.allOncalls(), api.users.getTeamsUsers()]);
      return {
        oncalls: oncallData.oncalls as Oncall[],
        users: userData.users as User[],
      };
    },
    [],
    {
      onError: async () => {
        await showToast({
          style: Toast.Style.Failure,
          title: "Failed to load data",
          message: "Please try again later",
        });
      },
    },
  );

  const handleInputChange = useCallback((key: keyof FormState, value: Date | string) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const validateForm = useCallback(() => {
    const { oncall, user, startDate, endDate } = formState;
    if (!oncall || !user) {
      throw new Error("Please fill in all required fields");
    }
    if (moment(startDate).isAfter(endDate)) {
      throw new Error("Start date must be before end date");
    }
  }, [formState]);

  interface OverrideData {
    oncall: string;
    user: string;
    desc: string;
    startDate: string;
    endDate: string;
    startTime: string;
    endTime: string;
  }

  const handleSubmit = useCallback(async () => {
    try {
      validateForm();
      const { oncall, user, desc, startDate, endDate } = formState;
      const data: OverrideData = {
        oncall,
        user,
        desc,
        startDate: moment(startDate).format("DD/MM/YYYY HH:mm"),
        endDate: moment(endDate).format("DD/MM/YYYY HH:mm"),
        startTime: moment(startDate).format("HH:mm"),
        endTime: moment(endDate).format("HH:mm"),
      };
      await api.oncall.addOverride(data);
      await showToast({ style: Toast.Style.Success, title: "Override added" });
      pop();
    } catch (error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to add override",
        message: error instanceof Error ? error.message : "An unexpected error occurred",
      });
    }
  }, [formState, validateForm, pop]);

  if (isLoading) {
    return <Form isLoading={true} />;
  }

  const oncalls = data?.oncalls || [];
  const users = data?.users || [];

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Submit" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.Dropdown
        id="oncall"
        title="Oncall"
        value={formState.oncall}
        onChange={(value) => handleInputChange("oncall", value)}
      >
        {oncalls.map((oncall) => (
          <Form.Dropdown.Item key={oncall._id} value={oncall._id} title={oncall.name} />
        ))}
      </Form.Dropdown>
      <Form.Dropdown
        id="user"
        title="Override User"
        value={formState.user}
        onChange={(value) => handleInputChange("user", value)}
      >
        {users.map((user) => (
          <Form.Dropdown.Item key={user._id} value={user._id} title={`${user.firstName} ${user.lastName}`} />
        ))}
      </Form.Dropdown>
      <Form.TextArea
        id="desc"
        title="Description"
        placeholder="Description"
        value={formState.desc}
        onChange={(value) => handleInputChange("desc", value || "")}
      />
      <Form.DatePicker
        id="startDate"
        title="Start date"
        value={formState.startDate}
        onChange={(value) => handleInputChange("startDate", value || "")}
      />
      <Form.DatePicker
        id="endDate"
        title="End date"
        value={formState.endDate}
        onChange={(value) => handleInputChange("endDate", value || "")}
      />
    </Form>
  );
}
