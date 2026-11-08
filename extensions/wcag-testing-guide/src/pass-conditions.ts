/**
 * Criterion-specific assessment prompts, not substitutes for the normative text.
 * Each result assumes every applicable instance and relevant state is checked.
 * A documented exception may be used only if that criterion actually permits it.
 */
export const passConditions: Record<string, string> = {
  "1.2.1":
    "Prerecorded audio-only has an equivalent time-based-media alternative, and prerecorded video-only has an equivalent time-based-media alternative or audio track, except where the media is itself clearly labeled as a text alternative.",
  "1.2.2":
    "Every applicable prerecorded synchronized-media presentation has accurate, synchronized captions for speech and meaningful non-speech audio, including speaker identification where needed.",
  "1.2.3":
    "Every applicable prerecorded synchronized-media presentation includes audio description or a complete time-based-media alternative for important visual information, except where the media is itself clearly labeled as a text alternative.",
  "1.2.4":
    "Live synchronized media provides captions that convey speech and meaningful sound information in time for users to follow the event.",
  "1.2.5":
    "Every applicable prerecorded synchronized-media presentation has audio description of the important visual information that the main soundtrack does not convey.",
  "1.2.6":
    "All prerecorded audio content in synchronized media has an accurate, synchronized sign-language interpretation.",
  "1.2.7":
    "Where natural pauses are insufficient for necessary audio descriptions, an extended audio-described version supplies the missing visual information.",
  "1.2.8":
    "A complete time-based-media alternative conveys the essential visual and auditory content of each applicable prerecorded synchronized-media presentation and of each prerecorded video-only presentation.",
  "1.2.9":
    "Live audio-only content offers an equivalent time-based-media alternative that communicates the information as it becomes available.",
  "1.3.1":
    "Every visually or otherwise conveyed structure, relationship, and piece of information is also programmatically determinable or available in text, including headings, groups, labels, and table relationships.",
  "1.3.2":
    "When the order of content changes its meaning, the programmatically determined reading sequence preserves the correct meaning in every relevant layout.",
  "1.3.3":
    "Instructions do not rely exclusively on shape, color, size, position, orientation, or sound; users can identify each referenced element without the sensory cue.",
  "1.3.4":
    "Content and functionality work in portrait and landscape orientations unless a specific display orientation is essential to the activity.",
  "1.3.5":
    "Each applicable input collecting information about the user exposes its purpose programmatically using a supported input-purpose taxonomy, such as a correct HTML autocomplete token.",
  "1.3.6":
    "The purposes of applicable interface components, icons, and regions can be programmatically determined using an appropriate supported taxonomy or semantics.",
  "1.4.1":
    "Color is never the only visual method used to communicate information, identify an action, prompt for a response, or distinguish an element or state.",
  "1.4.2":
    "If audio plays automatically for more than three seconds, users can stop or pause it, or independently control its volume without changing the system-wide volume.",
  "1.4.4":
    "Text can be enlarged to 200% without assistive technology while keeping all content and functionality available, except for captions and images of text.",
  "1.4.5":
    "Where the technology supports the desired presentation, meaningful text is rendered as real text rather than an image of text, except for essential presentation or user-customizable images of text.",
  "1.4.6":
    "Text and images of text have at least 7:1 contrast, or 4.5:1 for large text, except for the exclusions expressly defined by this criterion.",
  "1.4.9":
    "Images of text are used only when they are purely decorative or the text presentation is essential to the information being conveyed.",
  "1.4.12":
    "With line height at 1.5 times font size, paragraph spacing at twice font size, letter spacing at 0.12 times font size, and word spacing at 0.16 times font size, no content or functionality is lost.",
  "1.4.13":
    "Additional content triggered by hover or focus is dismissible without changing focus or pointer location, hoverable when pointer-triggered, and persistent until dismissed, invalidated, or the trigger ends, except where the corresponding exceptions apply.",
  "2.1.1":
    "All functionality can be operated via keyboard interfaces without specific timing for individual keystrokes, except for functions whose underlying input intrinsically depends on a movement path.",
  "2.1.2":
    "Keyboard focus can always leave a component using standard keyboard navigation, or any nonstandard exit method is clearly communicated to the user.",
  "2.1.3":
    "All functionality is operable via keyboard without exceptions for path-dependent underlying inputs and without requiring specific timing for individual keystrokes.",
  "2.1.4":
    "Every single-character shortcut can be disabled or remapped to include a non-printing modifier, or is active only while its associated component has focus.",
  "2.2.3":
    "No time limit is imposed by the content unless the timing is essential to the activity or the limit is part of a real-time event.",
  "2.2.4":
    "Nonemergency interruptions can be postponed or suppressed by the user; only interruptions involving an emergency may be unavoidable.",
  "2.2.5":
    "After reauthentication in the same activity, users can continue without losing information they entered before their session expired.",
  "2.2.6":
    "For any inactivity timeout that may lose user data, users are warned of its expected duration at the start of the process, unless the data is preserved for more than 20 hours without user action.",
  "2.3.2":
    "No content flashes more than three times in any one-second period, regardless of flash size or measured flash threshold.",
  "2.3.3":
    "Motion animation triggered by interaction can be disabled, unless the animation is essential to the functionality or the information being conveyed.",
  "2.4.1":
    "A keyboard-operable way to bypass content blocks repeated across multiple pages is available and moves users to the intended content.",
  "2.4.2":
    "Each web page has a programmatically determinable title that describes its topic or purpose.",
  "2.4.3":
    "When sequential navigation order affects meaning or operation, keyboard focus follows an order that preserves both.",
  "2.4.4":
    "Each link's purpose can be determined from its link text alone or together with programmatically determined link context, unless its purpose is intentionally ambiguous to users generally.",
  "2.4.5":
    "For each page in a set, users have at least two ways to locate it, except when the page is a result of, or step in, a process.",
  "2.4.7":
    "Every keyboard-operable interface exposes a visible indication of keyboard focus when its components have focus.",
  "2.4.8":
    "Users can find information identifying their current location within a set of web pages.",
  "2.4.9":
    "The purpose of each link is clear from the link text alone, except where the purpose would be ambiguous to users in general.",
  "2.4.10":
    "Headings are used to organize the sections of the content wherever the content has identifiable sections.",
  "2.4.11":
    "When a component gains keyboard focus, author-created content does not completely hide it, accounting for the criterion's notes on movable and user-opened content.",
  "2.4.12":
    "When a component gains keyboard focus, no part is hidden by author-created content, with the criterion's notes on user-movable and user-opened content applied where relevant.",
  "2.5.1":
    "Every function using multipoint or path-based gestures can also be operated using a single pointer without a path-based gesture, unless the gesture is essential.",
  "2.5.2":
    "Each single-pointer function either avoids activation on down-event, completes on up-event with an abort or undo mechanism, reverses an earlier down-event on up-event, or qualifies for the essential-down-event exception.",
  "2.5.3":
    "For every control with a visible text label, its accessible name contains that visible text, ideally at the beginning and in the same order.",
  "2.5.4":
    "Functions controlled by device or user motion can also be operated through interface controls, and accidental motion activation can be disabled, except where the motion is essential or the interface relies on a supported accessibility operation.",
  "2.5.5":
    "Every pointer target is at least 44 by 44 CSS pixels, unless it meets an explicit equivalent, inline, user-agent, or essential-size exception.",
  "2.5.6":
    "Users can operate the content with any supported input mechanism, and switching methods is not restricted unless that restriction is essential, required for security, or respects user settings.",
  "2.5.7":
    "Every function requiring a dragging movement can also be achieved with a single pointer without dragging, unless dragging is essential or the functionality is determined by the user agent and not modified by the author.",
  "3.1.1":
    "The default human language of each web page is programmatically determinable, such as via an accurate html lang attribute.",
  "3.1.2":
    "Changes of human language within content are programmatically determinable, except proper names, technical terms, words of indeterminate language, and words assimilated into the surrounding language.",
  "3.1.3":
    "The meaning of words or phrases used in an unusual or restricted way, including idioms and jargon, is available through an accessible mechanism.",
  "3.1.4":
    "An accessible mechanism identifies the expanded form or meaning of every relevant abbreviation.",
  "3.1.5":
    "When text requires more advanced reading ability than lower secondary education, supplementary content or an alternative version at that reading level is available, after removing proper names and titles.",
  "3.1.6":
    "Where meaning would be ambiguous without knowing pronunciation, an accessible mechanism supplies the pronunciation.",
  "3.2.1":
    "Moving keyboard focus to a component does not, by itself, cause an unexpected change of context.",
  "3.2.2":
    "Changing a form field or other interface setting does not automatically change context unless the user was advised of this behavior before using the control.",
  "3.2.3":
    "Navigation mechanisms repeated on multiple pages within a set appear in the same relative order, unless the user initiates a change.",
  "3.2.4":
    "Components with the same functionality throughout a set of pages are consistently identified by their accessible and visible cues.",
  "3.2.5":
    "Changes of context occur only on user request, or users have an accessible way to turn off automatic context changes.",
  "3.2.6":
    "When contact details, contact mechanisms, self-help options, or fully automated contact mechanisms appear on multiple pages, they appear in the same relative order, unless the user initiates a change.",
  "3.3.1":
    "Automatically detected input errors are identified, and the specific item in error is described to the user in text.",
  "3.3.2":
    "Labels or instructions are provided whenever the content requires user input, including needed formats and constraints.",
  "3.3.3":
    "When an input error is detected and a correction is known, the user is given an accessible suggestion unless that suggestion would compromise security or the purpose of the content.",
  "3.3.4":
    "For submissions that create legal commitments, financial transactions, or modify or delete user-controlled data in storage, the user can reverse, check, or confirm the submission under one of the criterion's allowed mechanisms.",
  "3.3.5":
    "Context-sensitive help is available where users are expected to need support in completing a task or providing input.",
  "3.3.6":
    "For every applicable user-submitted form, users can reverse the submission, check and correct the data, or review and confirm the information before finalizing it.",
  "4.1.1":
    "For WCAG 2.1, content using markup has complete start and end tags, proper nesting, no duplicate attributes, and unique IDs as required by the specification, except where the specification permits otherwise; this criterion does not exist in WCAG 2.2.",
  "4.1.3":
    "Status messages can be programmatically determined through role or properties so assistive technology can announce them without moving keyboard focus.",
};
