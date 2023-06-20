import { Priority, State, Status, UUID } from "./task-cli.type";

/**
 * Taskwarrior task
 * @see https://taskwarrior.org/docs/design/task.html
 */
export type Task = {
  /**
   * Task ID
   * @example 42
   */
  id: string;
  /**
   * Task UUID
   * @example 8559e451-5728-4cc9-adc2-ed6e1a3889e0
   */
  uuid: string;
  /**
   * Status of task
   * @example completed | pending | waiting | recurring | deleted
   */
  status: Status;
  /**
   * Date task was created
   * @example YYYYMMDDTHHMMSSZ
   */
  entry: string;
  /**
   * Task description text
   * @example Buy spaceship
   */
  description: string;
  /**
   * Date task was started
   * @example YYYYMMDDTHHMMSSZ
   */
  start?: string;
  /**
   * Date task was completed/deleted
   * @example YYYYMMDDTHHMMSSZ
   */
  end?: string;
  /**
   * Due date
   * @example YYYYMMDDTHHMMSSZ
   */
  due?: string;
  /**
   * Expiration date of a task
   * @example YYYYMMDDTHHMMSSZ
   */
  until?: string;
  /**
   * Date until task becomes pending
   * @example YYYYMMDDTHHMMSSZ
   */
  wait?: string;
  /**
   * Date task was last modified
   * It is used as a reference when merging tasks
   * @example YYYYMMDDTHHMMSSZ
   */
  modified?: string;
  /**
   * Date task is scheduled to start
   * @example YYYYMMDDTHHMMSSZ
   */
  scheduled?: string;
  /**
   * Recurrence frequency
   * @example daily | weekly | monthly | yearly
   */
  recur?: string;
  /**
   * Recurrence mask of child status indicators
   * Each character is a slot
   * Each slot indicates that the child tasks is:
   *  - Pending
   *  + Completed
   *  X Deleted
   *  W Waiting
   * @example "+++-" => 4 child tasks, 3 completed, 1 pending
   * @example "X" => 1 child task, deleted
   */
  // mask?: string;
  /**
   * Child recurring tasks have an "imask" field instead of a "mask" field like their parent
   * It is a zero-based integer offset into the "mask" field of the parent
   * If a child task is completed, one of the changes that MUST occur is to look up the parent task, and using "imask" set the "mask" of the parent to the correct indicator.
   * This prevents recurring tasks from being generated twice.
   * @example 0 => first character of parent's mask
   */
  // imask?: number;
  /**
   * Parent task UUID
   * A recurring task instance MUST have a "parent" field, which is the UUID of the task that has "status" of "recurring".
   * This linkage between tasks, established using "parent", "mask" and "imask" is used to track the need to generate more recurring tasks.
   */
  parent?: UUID;
  /**
   * Project name
   * Note that projects receive special handling, so that when a "." (U+002E) is used, it implies a hierarchy
   * @example home | home.kitchen | home.kitchen.sink
   */
  project?: string;
  /**
   * Priority
   * These represent High, Medium and Low priorities
   * An absent priority field indicates no priority
   * @example L | M | H
   */
  priority?: Priority;
  /**
   * Other tasks that this task depends upon
   * It is a comma-separated unique set of UUIDs.
   * If Task 2 depends on Task 1
   *  Task 2 is considered a "blocked"
   *  Task 1 is considered a "blocking"
   *  Task 1 must be completed first
   * NOTE: In a future version of this specification, this will be changed to a JSON array of strings, like the "tags" field
   * @example 8559e451-5728-4cc9-adc2-ed6e1a3889e0
   */
  // depends?: string | string[];
  /**
   * Task tags
   * Each tag is a single word containing no spaces
   * @example home | next
   */
  tags?: string[];
  /**
   * Task cost
   * @example 21.8219
   */
  urgency?: number;
  /**
   * Task state
   * @example active | overdue | completed | blocked | blocking | done | scheduled | ready
   */
  state: State;
};

/**
 * Conditional attributes upon the state of a task
 * https://github.com/GothenburgBitFactory/taskwarrior/blob/develop/docs/rfcs/task.md#the-attributes
 *
 * Req = required, Opt = optional, Pvt = Internal
 *
 * Attribute   ,Type      ,Pending ,Deleted ,Completed ,Waiting ,RecParent ,RecChild
 * uuid        ,UUID      ,Req     ,Req     ,Req       ,Req     ,Req       ,Req
 * status      ,String    ,Req     ,Req     ,Req       ,Req     ,Req       ,Req
 * entry       ,Date      ,Req     ,Req     ,Req       ,Req     ,Req       ,Req
 * description ,Type      ,Req     ,Req     ,Req       ,Req     ,Req       ,Req
 * start       ,Date      ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * end         ,Date      ,        ,Req     ,Req       ,        ,          ,
 * due         ,Date      ,Opt     ,Opt     ,Opt       ,Opt     ,Req       ,Opt
 * until       ,Date      ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * scheduled   ,Date      ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * wait        ,Date      ,        ,        ,          ,Req     ,          ,
 * recur       ,String    ,        ,        ,          ,        ,Req       ,Req
 * mask        ,String    ,        ,        ,          ,        ,Pvt       ,
 * imask       ,Number    ,        ,        ,          ,        ,          ,Pvt
 * parent      ,UUID      ,        ,        ,          ,        ,          ,Req
 * annotation  ,[]        ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * project     ,String    ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * tags        ,String[]  ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * priority    ,String    ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * depends     ,String    ,Opt     ,Opt     ,Opt       ,Opt     ,Opt       ,Opt
 * modified    ,Date      ,Pvt     ,Pvt     ,Pvt       ,Pvt     ,Pvt       ,Pvt
 **/
