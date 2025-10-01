import { useFetch } from "@raycast/utils";
import { API_URL, headers, parseResponse } from "./koyeb";
import { Color, Icon, Image, List } from "@raycast/api";
import { Activity } from "./types";

const ACTIVITY_TYPE_ICONS: Record<string, Image.Source> = {
  app: "boxes.svg",
  domain: Icon.Globe,
  deployment: Icon.Box,
  organization: Icon.Building,
  secret: Icon.Key,
  service: Icon.Box,
  session: Icon.Person,
  subscription: Icon.CreditCard,
};
const ACTIVITY_VERB_COLORS: Record<string, Color.ColorLike> = {
  autoscaled: Color.Blue,
  created: Color.Green,
  deleted: Color.Red,
  payment_succeeded: Color.Blue,
  succeeded: Color.Green,
  updated: Color.Blue,
};

function getActivityIcon(activity: Activity): Image.ImageLike {
  const source = ACTIVITY_TYPE_ICONS[activity.object.type] || Icon.Heartbeat;
  let tintColor = ACTIVITY_VERB_COLORS[activity.verb];
  if (activity.verb === "created" && activity.object.type === "session") tintColor = Color.Blue;
  return { source, tintColor };
}

function getTitle(activity: Activity) {
  if (activity.actor.type === "credential") return activity.actor.name;

  if (activity.object.type === "deployment") {
    switch (activity.verb) {
      case "autoscaled":
        if (activity.metadata.count === 0) return `Went to sleep`;
        break;
      case "succeeded":
        return `Deployment ${activity.object.id.split("-")[0]} succeeded`;
    }
  }

  if (activity.object.type === "domain") {
    switch (activity.verb) {
      case "created":
        return activity.actor.name;
      case "deleted":
        return "Deleted domain";
      case "updated":
        return "Updated domain";
    }
  }

  if (activity.object.type === "session") return activity.actor.name;

  if (activity.object.type === "subscription") {
    switch (activity.verb) {
      case "created":
        return activity.actor.name;
      case "payment_succeeded":
        return "A payment succeeded";
    }
  }

  if (activity.object.type === "organization") {
    switch (activity.metadata.event) {
      case "payment_method_refreshed":
      case "payment_method_updated":
        return `Updated organization ${activity.object.name}`;
      default:
        return activity.actor.name;
    }
  }

  return `${activity.verb} ${activity.object.type}`;
}

function getSubtitle(activity: Activity) {
  if (activity.object.type === "domain") {
    if (activity.verb === "created") return "Created domain";
    if (activity.actor.type === "credential") {
      switch (activity.verb) {
        case "deleted":
          return "Deleted domain";
        case "updated":
          return "Updated domain";
      }
    }
  }

  if (activity.object.type === "subscription") {
    if (activity.verb === "created") return "A new subscription was created";
  }

  if (activity.object.type === "organization") {
    switch (activity.metadata.event) {
      case "payment_method_refreshed":
      case "payment_method_updated":
        return undefined;
      default:
        if (activity.verb === "updated") return `Updated organization ${activity.object.name}`;
        if (activity.verb === "created") return `Created organization ${activity.object.name}`;
    }
  }

  if (activity.object.type === "secret") {
    if (activity.verb === "created") return "Created secret";
  }

  if (activity.object.type === "session") {
    if (activity.verb === "created") return "Logged in";
  }

  return undefined;
}

function getAccessories(activity: Activity) {
  const accessories: List.Item.Accessory[] = [];

  switch (activity.object.type) {
    case "domain":
    case "secret":
      accessories.push({ tag: activity.object.name });
      break;
    case "deployment":
      accessories.push({ tag: `${activity.object.metadata?.app_name}/${activity.object.metadata?.app_name}` });
      if (activity.metadata.region) accessories.push({ tag: activity.metadata.region.toUpperCase() });
      break;
  }

  accessories.push({ icon: Icon.Clock, date: new Date(activity.created_at) });
  return accessories;
}

export default function ListActivities() {
  const { isLoading, data: activities } = useFetch(API_URL + "activities?limit=20", {
    headers,
    parseResponse,
    mapResult(result: { activities: Activity[] }) {
      return {
        data: result.activities,
      };
    },
    initialData: [],
  });

  return (
    <List isLoading={isLoading}>
      {activities.map((activity) => (
        <List.Item
          key={activity.id}
          icon={getActivityIcon(activity)}
          title={getTitle(activity)}
          subtitle={getSubtitle(activity)}
          accessories={getAccessories(activity)}
        />
      ))}
    </List>
  );
}
