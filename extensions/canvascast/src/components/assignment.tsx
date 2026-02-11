import { List, Detail, Action, ActionPanel, Icon, Color, getPreferenceValues } from "@raycast/api";
import { assignment, Preferences, apiAssignment } from "../utils/types";
import { Icons, convertHTMLToMD } from "../utils/utils";
import { useEffect, useState } from "react";
import { api } from "../utils/api";

const ViewAssignment = ({ assignment, apiAssignment }: { assignment: assignment; apiAssignment: apiAssignment }) => {
  const preferences: Preferences = getPreferenceValues();

  return (
    <Detail
      markdown={`# ${apiAssignment.name}\n\n${convertHTMLToMD(
        apiAssignment.description ?? "No additional details were added for this assignment.",
      )}`}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${assignment.course_id}/assignments/${assignment.id}`}
          />
          {apiAssignment.description?.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)?.length && (
            <Action.OpenInBrowser
              title={`Copy Google Doc`}
              icon={Icons.OpenGoogleCopyLink}
              url={apiAssignment.description.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)[0]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label
            title="Due Date"
            text={new Date(assignment.date).toDateString() + " at " + assignment.pretty_date.substring(7)}
          />
          {apiAssignment.submission && (
            <>
              <Detail.Metadata.TagList title="Status">
                {apiAssignment.submission.submitted_at ? (
                  new Date(apiAssignment.submission.submitted_at) > assignment.date ? (
                    <Detail.Metadata.TagList.Item text="Late" color={Color.Red} />
                  ) : (
                    <Detail.Metadata.TagList.Item text="Submitted" color={Color.Green} />
                  )
                ) : new Date() > assignment.date && assignment.special_missing ? (
                  <Detail.Metadata.TagList.Item text="Missing" color={Color.Red} />
                ) : (
                  <Detail.Metadata.TagList.Item text="No Submission" color={Color.SecondaryText} />
                )}
                {apiAssignment.submission.graded_at && (
                  <Detail.Metadata.TagList.Item text="Graded" color={Color.PrimaryText} />
                )}
              </Detail.Metadata.TagList>
              {apiAssignment.submission.graded_at && (
                <Detail.Metadata.Label
                  title="Score"
                  text={
                    apiAssignment.submission.grade == "complete"
                      ? `Complete/${apiAssignment.points_possible} point${
                          apiAssignment.points_possible !== 1 ? "s" : ""
                        }`
                      : `${apiAssignment.submission.score}/${apiAssignment.points_possible} point${
                          apiAssignment.points_possible !== 1 ? "s" : ""
                        }`
                  }
                />
              )}
            </>
          )}
          <Detail.Metadata.Separator />
          <Detail.Metadata.Label title="Course" text={assignment.course} />
        </Detail.Metadata>
      }
    />
  );
};

export const Assignment = ({ assignment }: { assignment: assignment }) => {
  const preferences: Preferences = getPreferenceValues();
  const [apiAssignment, setApiAssignment] = useState<apiAssignment>({ name: "", description: "", points_possible: 0 });
  useEffect(() => {
    async function load() {
      const apiAssignment = await api.courses[assignment.course_id].assignments[assignment.id]
        .searchParams({
          "include[]": "submission",
        })
        .get();
      setApiAssignment(apiAssignment);
    }
    load();
  }, []);

  return (
    <List.Item
      title={assignment.name}
      subtitle={assignment.course}
      icon={{ source: Icons["Assignment"], tintColor: assignment.color }}
      actions={
        <ActionPanel>
          <Action.Push
            title="View Assignment"
            icon={{ source: Icons["Assignment"], tintColor: Color.PrimaryText }}
            target={<ViewAssignment assignment={assignment} apiAssignment={apiAssignment} />}
          />
          <Action.OpenInBrowser
            url={`https://${preferences.domain}/courses/${assignment.course_id}/discussion_topics/${assignment.id}`}
          />
          {apiAssignment.description?.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)?.length && (
            <Action.OpenInBrowser
              title={`Copy Google Doc`}
              icon={Icons.OpenGoogleCopyLink}
              url={apiAssignment.description.match(/https:\/\/docs\.google\.com\/document\/d\/.*?\/copy/g)[0]}
              shortcut={{ modifiers: ["cmd", "shift"], key: "c" }}
            />
          )}
        </ActionPanel>
      }
      accessories={
        assignment?.time
          ? [
              {
                text: assignment.pretty_date,
                ...(apiAssignment?.submission?.submitted_at
                  ? { icon: Icons.Completed, tooltip: "Submitted" }
                  : assignment.special_missing
                    ? { icon: Icons.Missing, tooltip: "Missing" }
                    : {}),
              },
            ]
          : [{ text: assignment.pretty_date, icon: Icon.Calendar }]
      }
    />
  );
};
