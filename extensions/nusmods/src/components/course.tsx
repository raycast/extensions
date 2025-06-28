import { Action, ActionPanel, Detail, Icon, List, showToast, Toast } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import * as z from "@zod/mini";
import { useCallback } from "react";
import { API_BASE_URL, WEBSITE_BASE_URL } from "../utils/constants";
import { generateMarkdown } from "../utils/markdown";
import { CourseDetailsSchema, CourseSummary } from "../utils/nusmods";

const CourseDetail: React.FC<{
  moduleCode: string;
  acadYear: string;
}> = (props) => {
  const parseResponse = useCallback(async (res: Response) => {
    if (!res.ok) {
      console.error("Failed to fetch course details:", res.status, res.statusText);
      showToast({
        title: "Failed to fetch course details",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    const data = await res.json();
    if (!data) {
      console.error("Failed to unmarshal course details");
      showToast({
        title: "Failed to unmarshal course details",
        message: "Please try again later.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    const parseResult = await CourseDetailsSchema.safeParseAsync(data);
    if (!parseResult.success) {
      console.error(z.prettifyError(parseResult.error));
      showToast({
        title: "Validation error",
        message: "Unexpected course details data received from NUSMods API, please report this issue.",
        style: Toast.Style.Failure,
      });
      return null;
    }

    return parseResult.data;
  }, []);

  const { isLoading, data, error } = useFetch(`${API_BASE_URL}/${props.acadYear}/modules/${props.moduleCode}.json`, {
    parseResponse,
  });

  const nusModsUrl = `${WEBSITE_BASE_URL}/courses/${props.moduleCode}`;

  return (
    <Detail
      isLoading={isLoading}
      navigationTitle={props.moduleCode}
      markdown={error || !data ? "Unable to load course details." : generateMarkdown(data)}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser url={nusModsUrl} />
        </ActionPanel>
      }
      metadata={
        error || !data ? undefined : (
          <Detail.Metadata>
            <Detail.Metadata.Label title="Module Code" text={data.moduleCode} />
            <Detail.Metadata.Label title="Academic Year" text={data.acadYear} />
            <Detail.Metadata.Label title="Module Title" text={data.title} />
            <Detail.Metadata.Label title="Department" text={data.department} />
            <Detail.Metadata.Label title="Faculty" text={data.faculty} />
            <Detail.Metadata.Label title="Module Credit" text={data.moduleCredit} />
            {data.gradingBasisDescription && (
              <Detail.Metadata.Label title="Grading Basis" text={data.gradingBasisDescription} />
            )}
            {data.fulfillRequirements && (
              <Detail.Metadata.TagList title="Fulfill Requirements">
                {data.fulfillRequirements.map((req) => (
                  <Detail.Metadata.TagList.Item key={req} text={req} />
                ))}
              </Detail.Metadata.TagList>
            )}
            <Detail.Metadata.Separator />
            <Detail.Metadata.Link title="Open in NUSMods" target={nusModsUrl} text="NUSMods" />
          </Detail.Metadata>
        )
      }
    />
  );
};

export const CourseSummaryList: React.FC<{
  courseSummaries: Array<CourseSummary>;
  acadYear: string;
}> = (props) => {
  const { courseSummaries, acadYear } = props;

  return courseSummaries.length === 0 ? (
    <List.EmptyView icon={Icon.Bird} title="No courses found" description="Try a different academic year." />
  ) : (
    courseSummaries.map((courseSummary) => (
      <List.Item
        key={courseSummary.moduleCode}
        keywords={[courseSummary.moduleCode, courseSummary.title]}
        title={courseSummary.moduleCode}
        subtitle={courseSummary.title}
        accessories={[
          {
            text: "Semesters: " + courseSummary.semesters.join(", "),
          },
        ]}
        actions={
          <ActionPanel>
            <Action.Push
              title="Show Details"
              target={<CourseDetail moduleCode={courseSummary.moduleCode} acadYear={acadYear} />}
            />
          </ActionPanel>
        }
      />
    ))
  );
};
