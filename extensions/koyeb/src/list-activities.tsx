import { useFetch } from "@raycast/utils";
import { API_URL, headers, parseResponse } from "./koyeb";
import { Color, Icon, Image, List } from "@raycast/api";
import { Activity } from "./types";

export default function ListActivities() {
    const {isLoading, data: activities} = useFetch(API_URL + "activities?limit=20", {
        headers,
        parseResponse,
        mapResult(result: {activities: Activity[]}) {
            return {
                data: result.activities
            }
        },
        initialData: []
    })

    function getActivityIcon(activity: Activity): Image.ImageLike {
        let source: Image.Source;
        let tintColor: Color.ColorLike | undefined = undefined;
        
        switch (activity.object.type) {
            case "domain":
                source = Icon.Globe;
                break;
            case "organization":
                source = Icon.Building;
                break;
            case "session":
                source = Icon.Person;
                break;
            case "subscription":
                source = Icon.CreditCard;
                break;
            default:
                source = Icon.Heartbeat
                break;
        }
        switch (activity.verb) {
            case "created":
                tintColor = Color.Green;
                break;
            case "deleted":
                tintColor = Color.Red;
                break;
            case "updated":
            case "payment_succeeded":
                tintColor = Color.Blue;
                break;
            default:
                break;
        }

        return {source, tintColor};
    }

    function getTitle(activity: Activity) {
        if (activity.actor.type==="credential") return activity.actor.name;
        
        if (activity.object.type==="domain") {
            switch (activity.verb) {
                case "created":
                    return activity.actor.name;
                case "deleted":
                    return "Deleted domain";
                case "updated":
                    return "Updated domain";
                default:
                    break;
            }
        }

        if (activity.object.type==="session") return activity.actor.name;
        
        if (activity.object.type==="subscription") {
            switch (activity.verb) {
                case "created":
                    return activity.actor.name;
                case "payment_succeeded":
                    return "A payment succeeded";
                default:
                    break;
            }
        }

        if (activity.object.type==="organization") {
            switch (activity.metadata.event) {
                case "payment_method_refreshed":
                case "payment_method_updated":
                    return `Updated organization ${activity.object.name}`
                default:
                    return activity.actor.name;
            }
        }

        return `${activity.verb} ${activity.object.type}`;
    }

    function getSubtitle(activity: Activity) {
        if (activity.object.type==="domain") {
            if (activity.verb==="created") return "Created domain";
            if (activity.actor.type==="credential") {
                switch (activity.verb) {
                    case "deleted":
                        return "Deleted domain";
                    case "updated":
                        return "Updated domain";
                }
            }
        }

        if (activity.object.type==="subscription") {
            if (activity.verb==="created") return "A new subscription was created";
        }

        if (activity.object.type==="organization") {
            switch (activity.metadata.event) {
                case "payment_method_refreshed":
                case "payment_method_updated":
                    return undefined;
                default:
                    if (activity.verb==="updated") return `Updated organization ${activity.object.name}`;
                    if (activity.verb==="created") return `Created organization ${activity.object.name}`;
                    break;
            }
        }

        if (activity.object.type==="session") {
            if (activity.verb==="created") return "Logged in";
        }
    }

    return <List isLoading={isLoading}>
        {activities.map(activity => <List.Item key={activity.id} icon={getActivityIcon(activity)} title={getTitle(activity)} subtitle={getSubtitle(activity)} />)}
    </List>
}