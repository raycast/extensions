import { queryTodos } from '../api';
import { CommandListName } from '../types';

const VALID_LIST_NAMES: CommandListName[] = ['inbox', 'today', 'anytime', 'upcoming', 'someday'];

type Input = {
  /**
   * Filter by built-in list name. One of: inbox, today, anytime, upcoming, someday.
   * WARNING: omitting all filters returns ALL open to-dos — only do this when truly needed.
   */
  listName?: CommandListName;
  /** Filter by project ID — returns only to-dos belonging to this project. */
  projectId?: string;
  /** Filter by area ID — returns only to-dos directly in this area (not in a project). */
  areaId?: string;
};

export default async function ({ listName, projectId, areaId }: Input) {
  if (listName && !VALID_LIST_NAMES.includes(listName)) {
    throw new Error(`Invalid list name: "${listName}". Valid values: ${VALID_LIST_NAMES.join(', ')}`);
  }
  return await queryTodos({ listName, projectId, areaId });
}
