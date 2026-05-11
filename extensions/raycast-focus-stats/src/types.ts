/**
 * Represents one of Raycast's Focus Sessions.
 * This does not represent all of the data that is possible to extract from what Raycast logs, but
 * it's what is necessary in order for the extension to work as intended.
 */
export type Session = {
  /**
   * The session's identifier in the database.
   */
  id: number;

  /**
   * The specific aim or objective for this session.
   */
  goal: string;

  /**
   * The length of the session in minutes.
   */
  duration: number;

  /**
   * Timestamp for when the session started.
   */
  start: Date;
};

/**
 * Represents a Focus session that is currently in progress.
 * This is the value that should be cached until the session completes and we receive the session's
 * duration.
 */
export type PendingSession = {
  /**
   * The specific aim or objective for this session.
   */
  goal: string;

  /**
   * Timestamp for when the session started.
   */
  start: Date;
};

/**
 * Represents a newly completed Focus session with all required data.
 * This type contains the complete session information including goal, start time, and duration
 * that can be used to create a full Session record.
 */
export type NewSession = {
  /**
   * The specific aim or objective for this session.
   */
  goal: string;

  /**
   * Timestamp for when the session started.
   */
  start: Date;

  /**
   * The length of the session in minutes.
   */
  duration: number;
};

/**
 * Represents the event that occurs when a Focus Session starts.
 * Contains information about the session goal and start time.
 */
export type StartEvent = {
  type: "start";
  /**
   * The specific aim or objective for this session.
   */
  goal: string;

  /**
   * Timestamp for when the session started.
   */
  start: Date;
};

/**
 * Represents the summary event that occurs when a Focus Session concludes.
 * Contains information about the session duration.
 */
export type SummaryEvent = {
  type: "summary";
  /**
   * The length of the session in minutes.
   */
  duration: number;
};

/**
 * List of possible events that can occur, and that this extension cares about, during a Focus
 * Session.
 */
export type Event = StartEvent | SummaryEvent;
