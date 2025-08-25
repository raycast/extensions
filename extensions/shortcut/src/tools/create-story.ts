import { CreateStoryParams } from "@useshortcut/client";
import shortcut from "../utils/shortcut";

type Input = {
  /** REQUIRED - The name of the story. */
  name: string;
  /** The description of the story. */
  description?: string;
  /** The type of story (feature, bug, chore). */
  story_type?: "feature" | "chore" | "bug";
  /**
   * The ID of the iteration the story belongs to.
   * @format int64
   */
  iteration_id?: string;
  /**
   * The id of the group to associate with this story.
   * @format uuid
   */
  group_id?: string;
  /**
   * REQUIRED - The ID of the workflow state the story will be in. Mapped to the WorkflowState.id field. Ignore EpicWorkflow.
   * @format int64
   */
  workflow_state_id: string;
  /** An array of UUIDs of the owners of this story. */
  owner_ids?: string[];
  /**
   * The ID of the project the story belongs to.
   * @format int64
   */
  project_id?: string;
  /**
   * The ID of the epic the story belongs to.
   * @format int64
   */
  epic_id?: string;
  /**
   * The numeric point estimate of the story. Can also be null, which means unestimated.
   * @format int64
   */
  estimate?: string;
  /**
   * The due date of the story.
   * @format date-time
   */
  deadline?: string;
};

const mapInputToStoryParams = (input: Input): CreateStoryParams => {
  const storyParams: CreateStoryParams = Object.entries(input).reduce((acc, [key, value]) => {
    if (value === undefined || value === null || value === "") {
      return acc; // Skip undefined, null, and empty string values
    }
    switch (key) {
      case "iteration_id":
      case "project_id":
      case "epic_id":
      case "estimate":
      case "workflow_state_id":
        return {
          ...acc,
          [key]: parseInt(value as string, 10),
        };
      case "owner_ids":
        return {
          ...acc,
          [key]: value as string[],
        };
      default:
        return {
          ...acc,
          [key]: value,
        };
    }
  }, {} as CreateStoryParams);

  return storyParams;
};

const tool = async (input: Input) => {
  if (!input.name) {
    throw new Error("Name is required");
  }
  if (!input.workflow_state_id) {
    throw new Error("Workflow state ID is required");
  }

  return shortcut.createStory(mapInputToStoryParams(input)).then((response) => response.data);
};

export const confirmation = async (input: Input) => {
  const info = [{ name: "Name", value: input.name }];

  if (input.description) {
    info.push({ name: "Description", value: input.description });
  }

  if (input.story_type) {
    info.push({ name: "Type", value: input.story_type });
  }

  if (input.deadline) {
    info.push({ name: "Due Date", value: new Date(input.deadline).toLocaleDateString() });
  }

  if (input.estimate) {
    info.push({ name: "Estimate", value: `${input.estimate}` });
  }

  if (input.iteration_id) {
    const { data: iteration } = await shortcut.getIteration(parseInt(input.iteration_id as string, 10));
    info.push({ name: "Iteration", value: iteration.name });
  }

  if (input.group_id) {
    const { data: group } = await shortcut.getGroup(input.group_id);
    info.push({ name: "Group", value: group.name });
  }

  if (input.epic_id) {
    const { data: epic } = await shortcut.getEpic(parseInt(input.epic_id as string, 10));
    info.push({ name: "Epic", value: epic.name });
  }

  if (input.project_id) {
    const { data: project } = await shortcut.getProject(parseInt(input.project_id as string, 10));
    info.push({ name: "Project", value: project.name });
  }

  if (input.owner_ids) {
    const owners = await Promise.all(
      input.owner_ids.map(async (ownerId) => {
        const { data: owner } = await shortcut.getMember(ownerId, {});
        return owner.profile.name;
      })
    );
    info.push({ name: "Owners", value: owners.join(", ") });
  }

  return { info };
};

export default tool;
