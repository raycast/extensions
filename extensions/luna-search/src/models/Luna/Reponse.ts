import { PageContext } from "./Request";

/**
 * Represents the groups of page members within the Luna API response.
 * The main content group contains an array of widgets.
 */
interface PageMemberGroups {
  mainContent: {
    widgets: Widget[];
  };
}

/**
 * Represents an action associated with a widget, such as a link or button.
 * The action contains a target, which is typically a URL or other destination.
 */
interface Action {
  serviceToken: string;
  target: string;
}

/**
 * Base unit within a Luna response, representing a widget.
 * Widgets can have actions, an ID, presentation data, a type, and nested widgets.
 */
export interface Widget {
  actions: Action[];
  id: string;
  presentationData: string;
  type: string;
  widgets: Widget[];
}

/**
 * Represents the overall structure of the Luna API response.
 * The response contains a page context and a collection of page member groups.
 */
export interface LunaResponse {
  pageContext: PageContext;
  pageMemberGroups: PageMemberGroups;
}
