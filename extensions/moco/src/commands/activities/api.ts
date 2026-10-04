import { showToast, Toast } from "@raycast/api";
import { api } from "../../utils/api";
import { localDate } from "./utils";

// MOCO does not document the exact success codes (e.g. for DELETE), so accept every 2xx status.
const isSuccess = (status: number) => status >= 200 && status < 300;
import { z } from "zod";
import { Activity, EditActivityRequest, StartActivityRequest } from "./types";
import { Project } from "../projects/types";

import { Task } from "../tasks/types";
import { Customer } from "../customers/types";
import { User } from "../user/types";

const activitySchema = z.array(
  z.object({
    id: z.number(),
    date: z.string(),
    hours: z.number(),
    seconds: z.number(),
    description: z.string(),
    billed: z.boolean(),
    invoice_id: z.nullable(z.number()),
    billable: z.boolean(),
    tag: z.string(),
    remote_service: z.nullable(z.string()),
    remote_id: z.nullable(z.string()),
    remote_url: z.nullable(z.string().url()),
    project: z.object({
      id: z.number(),
      name: z.string(),
      billable: z.nullable(z.boolean()),
    }),
    task: z.object({
      id: z.number(),
      name: z.string(),
      billable: z.boolean(),
    }),
    customer: z.object({
      id: z.number(),
      name: z.string(),
    }),
    user: z.object({
      id: z.number(),
      firstname: z.string(),
      lastname: z.string(),
    }),
    hourly_rate: z.number().optional(),
    timer_started_at: z.nullable(z.string()),
    created_at: z.string(),
    updated_at: z.string(),
  }),
);

export const fetchActivities = async (
  projectID: number | null,
  lookbackDays: number,
  userID?: number,
): Promise<Activity[]> => {
  const today = localDate();

  const from = new Date();
  from.setDate(from.getDate() - lookbackDays);
  const from_date = localDate(from);

  const { data } = await api.get(`/activities`, {
    params: {
      project_id: projectID,
      user_id: userID,
      from: from_date,
      to: today,
    },
  });

  const activies = activitySchema.parse(data);

  return Object.values(activies)
    .map(
      (activity): Activity => ({
        id: activity.id as number,
        date: activity.date as string,
        billable: activity.billable as boolean,
        hours: activity.hours as number,
        seconds: activity.seconds as number,
        description: activity.description as string,
        billed: activity.billed as boolean,
        invoice_id: activity.invoice_id as number,
        tag: activity.tag as string,
        remote_service: activity.remote_service as string,
        remote_id: activity.remote_id as string,
        remote_url: activity.remote_url as string,
        project: activity.project as Project,
        task: activity.task as Task,
        customer: activity.customer as Customer,
        user: activity.user as User,
        hourly_rate: activity.hourly_rate as number,
        timer_started_at: activity.timer_started_at as string,
        created_at: activity.created_at as string,
        updated_at: activity.updated_at as string,
      }),
    )
    .sort((a, b) => (a.created_at > b.created_at || a.updated_at > b.updated_at ? -1 : 1));
};

export const startActivity = async (values: StartActivityRequest): Promise<boolean | void> => {
  const verb = values.hours === "" ? "start" : "logg";
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${verb.charAt(0).toUpperCase() + verb.slice(1)}ing activity...`,
  });
  const result = await api
    .post(`/activities`, {
      date: values.date,
      description: values.description,
      hours: values.hours,
      project_id: values.projectID,
      task_id: values.taskID,
    })
    .then((response) => {
      if (isSuccess(response.status)) {
        toast.style = Toast.Style.Success;
        toast.title = `Activity ${verb}ed`;
        return true;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Activity could not be ${verb}ed`;
        return false;
      }
    })
    .catch(function (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "An error occured";
      console.log(error);
    })
    .then((result) => {
      return result;
    });

  return result;
};

export const toggleActivity = async (activityID: number, startActivity: boolean): Promise<boolean | void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `${startActivity ? "Starting" : "Stopping"} activity...`,
  });

  const result = await api
    .patch(`/activities/${activityID}/${startActivity ? "start_timer" : "stop_timer"}`, {})
    .then((response) => {
      if (isSuccess(response.status)) {
        toast.style = Toast.Style.Success;
        toast.title = `Timer ${startActivity ? "started" : "stopped"}`;
        return true;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = `Failed to ${startActivity ? "start" : "stop"} timer`;
        return false;
      }
    })
    .catch(function (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "An error occured";
      console.log(error);
    })
    .then((result) => {
      return result;
    });

  return result;
};

export const editActivity = async (values: EditActivityRequest, activityID: number): Promise<boolean | void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Updating activity...",
  });

  const result = await api
    .put(`/activities/${activityID}`, {
      date: values.date,
      description: values.description,
      hours: values.hours,
    })
    .then((response) => {
      if (isSuccess(response.status)) {
        toast.style = Toast.Style.Success;
        toast.title = "Activity updated";
        return true;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Activity update failed";
        return false;
      }
    })
    .catch(function (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "An error occured";
      console.log(error);
    })
    .then((result) => {
      return result;
    });

  return result;
};

export const deleteActivity = async (activityID: number): Promise<boolean | void> => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Deleting activity...",
  });

  const result = await api
    .delete(`/activities/${activityID}`)
    .then((response) => {
      if (isSuccess(response.status)) {
        toast.style = Toast.Style.Success;
        toast.title = "Activity deleted";
        return true;
      } else {
        toast.style = Toast.Style.Failure;
        toast.title = "Activity delete failed";
        return false;
      }
    })
    .catch(function (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "An error occured";
      console.log(error);
    })
    .then((result) => {
      return result;
    });

  return result;
};
