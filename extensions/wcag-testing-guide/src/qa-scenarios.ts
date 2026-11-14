/** Examples complement the normative criterion, they do not redefine conformance. */
export type PracticalScenario = {
  web: string[];
  mobile: string[];
  commonFailure: string;
  evidence: string;
};

export const practicalScenarios: Record<string, PracticalScenario> = {
  "1.1.1": {
    web: [
      "Inspect product images, charts, icons and icon-only buttons in the accessibility tree; check the purpose conveyed by each alternative.",
      "With the screen reader running, identify the image or control without looking at it. Check decorative graphics are not announced.",
    ],
    mobile: [
      "Use VoiceOver on iOS or TalkBack on Android to navigate meaningful images, illustrated cards, and icon-only actions.",
      "Verify the accessible label describes the information or function. Check purely decorative elements are excluded from accessibility navigation.",
    ],
    commonFailure:
      "A close button is announced only as 'Button', or a chart is announced as 'Image' with no equivalent data.",
    evidence:
      "Capture the visual component and accessibility name, with the spoken output or accessibility-tree properties.",
  },
  "1.3.1": {
    web: [
      "Inspect headings, lists, data tables, input labels and error associations in the DOM/accessibility tree.",
      "Navigate tables and grouped fields with a screen reader to confirm the programmatic relationships match the visual information.",
    ],
    mobile: [
      "Inspect the native accessibility tree and grouping of related information, headings and form controls.",
      "Navigate by VoiceOver/TalkBack and verify relationships are clear without depending on visual proximity.",
    ],
    commonFailure:
      "A field looks labeled but its name is absent in the accessibility tree, or a table does not expose column headers.",
    evidence:
      "Record component hierarchy, accessible name/role, and an example of the incorrect screen-reader output.",
  },
  "1.3.2": {
    web: [
      "Compare the visual reading sequence with DOM reading order, including responsive layouts.",
      "Navigate linearly with a screen reader, not only with the Tab key, and note when content is announced out of context.",
    ],
    mobile: [
      "Swipe linearly through elements using VoiceOver or TalkBack on each supported screen size.",
      "Check that the content order remains meaningful after orientation or dynamic-text changes.",
    ],
    commonFailure:
      "A price is read before the associated product, or a modal's description is encountered after its controls in an illogical order.",
    evidence:
      "Record sequential announcements and a screenshot showing the intended visual order.",
  },
  "1.3.4": {
    web: [
      "Rotate a mobile browser to portrait and landscape, keeping the same task open.",
      "Confirm that no essential control or instruction is lost solely because of orientation.",
    ],
    mobile: [
      "Check device rotation while searching, editing a form, or opening an overlay.",
      "If the app is orientation-locked, document why the specific orientation is essential instead of treating a design preference as an exception.",
    ],
    commonFailure:
      "A booking form is usable in portrait, but landscape is blocked without an essential functional reason.",
    evidence:
      "Screenshots or screen recordings in both orientations and the reason for any claimed exception.",
  },
  "1.4.3": {
    web: [
      "Measure the foreground/background contrast of text across default, disabled, error, hover and selected states where the criterion applies.",
      "Use the correct threshold for normal or large text, and verify the real rendered background rather than a design-token assumption.",
    ],
    mobile: [
      "Compare rendered text with the app's background across light/dark themes and relevant states.",
      "Use suitable color measurements and distinguish design guidance from a formal native-app WCAG evaluation.",
    ],
    commonFailure:
      "Placeholder or error text is too faint against the field background, even though the default label passes.",
    evidence:
      "Capture foreground/background colors, contrast ratio, text size/weight and the tested state.",
  },
  "1.4.4": {
    web: [
      "Increase browser text size to 200% without relying on assistive magnification and complete the same task.",
      "Check that text is not clipped, truncated without access, or overlapped by a button or fixed container.",
    ],
    mobile: [
      "Enable large system text and relevant accessibility font-size settings; exercise dynamic type in native controls and custom components.",
      "Verify that labels, buttons, forms and dialogs remain understandable and operable; do not assume the web 200% technique maps directly to an OS text-size setting.",
    ],
    commonFailure:
      "An enlarged button label is cut off and the user cannot discover its full name or complete the task.",
    evidence:
      "Record text-scale setting, device/OS, before-and-after captures and the exact affected control.",
  },
  "1.4.10": {
    web: [
      "At a viewport equivalent to 320 CSS pixels wide for vertically scrolling content, check for lost content and two-dimensional scrolling; apply the specific exceptions for content requiring 2D layout.",
      "Repeat with form validation, menus and expanded disclosures visible; consider vertically written content at a height equivalent to 256 CSS pixels.",
    ],
    mobile: [
      "Check narrow screens, landscape and text enlargement for clipping and unintended horizontal navigation.",
      "Do not equate native layout dimensions with CSS pixel thresholds; evaluate native behavior using applicable non-web requirements and platform guidance.",
    ],
    commonFailure:
      "At the narrow layout, a fixed-width modal hides the confirmation button beyond the viewport.",
    evidence:
      "Record CSS viewport dimensions, zoom, screenshot, any horizontal scroll and whether the 2D exception applies.",
  },
  "1.4.11": {
    web: [
      "Inspect visual boundaries/states that are necessary to identify controls and meaningful graphical objects; measure against adjacent colors.",
      "Include focus, selected, error and checked states when a visual cue is needed to identify the component or state.",
    ],
    mobile: [
      "Inspect actionable icons, selection controls and essential chart marks against their adjacent surfaces in both themes.",
      "Record the visual state and contrast instead of measuring only the text label.",
    ],
    commonFailure:
      "An unchecked checkbox has a pale outline on a white card, leaving its boundary hard to identify.",
    evidence:
      "Record the measured colors, 3:1 contrast calculation, and why the graphic/state is necessary for use.",
  },
  "1.4.12": {
    web: [
      "Override line height to 1.5, paragraph spacing to 2, letter spacing to 0.12 and word spacing to 0.16 times the font size, without changing other properties.",
      "Check text, controls, overlays, error messages and content revealed by interaction for loss or overlap.",
    ],
    mobile: [
      "On native screens, check large text and character/line spacing accommodations supported by the platform.",
      "Avoid claiming the HTML/CSS measurement technique applies unchanged to a native component.",
    ],
    commonFailure:
      "Increased line spacing causes the last line of a payment error to be clipped by a fixed-height container.",
    evidence:
      "Record injected text-spacing values, screenshot and the missing or overlapping content.",
  },
  "2.2.2": {
    web: [
      "Identify auto-starting moving, blinking or scrolling information that runs longer than five seconds beside other content.",
      "Check for a mechanism to pause, stop or hide it; separately examine automatically updating content under its own conditions and exceptions.",
    ],
    mobile: [
      "Review rotating banners, moving offers and live update areas for effective pause/stop controls.",
      "Verify that changes do not steal the active task and can be handled using accessible input.",
    ],
    commonFailure:
      "A self-advancing promotional carousel has no usable pause action while other content is visible.",
    evidence:
      "Timed recording showing when motion begins, its duration and the available controls.",
  },
  "2.4.6": {
    web: [
      "Read headings independently of their surrounding paragraphs and check that each describes the following section.",
      "Review visible field and button labels for the action or information requested.",
    ],
    mobile: [
      "Navigate headings and controls with VoiceOver/TalkBack and check that labels communicate a meaningful purpose.",
      "Check recurring controls in context rather than relying on their screen position.",
    ],
    commonFailure:
      "Every tab has the heading 'Information', and the field label 'Value' gives no indication of what to enter.",
    evidence:
      "List the exact labels, location and the associated content or expected action.",
  },
  "2.5.1": {
    web: [
      "Exercise pinch/rotate and gesture-drawing functions using only one pointer, such as a mouse or a single finger.",
      "Verify a non-path-based single-pointer alternative exists for functionality whose path is not essential.",
    ],
    mobile: [
      "Test maps and image galleries that require pinch-zoom or multi-finger rotation.",
      "Check on-screen zoom buttons or other suitable single-pointer controls; apply the essential exception carefully.",
    ],
    commonFailure:
      "A map supports zoom only through a two-finger pinch; no button or other single-pointer alternative is present.",
    evidence:
      "Record required gesture, alternative attempted and whether the alternative reaches the same outcome.",
  },
  "2.5.2": {
    web: [
      "Press down on a pointer-operated control, move the pointer away and release; observe when activation occurs.",
      "Verify an allowed up-event, abort/undo or other documented exception applies.",
    ],
    mobile: [
      "Touch a button, drag the finger off its hit region and release without lifting on the button.",
      "Check whether the action can be canceled before completion or undone where applicable.",
    ],
    commonFailure:
      "A destructive action fires immediately on touch-down, before a user has the chance to move the finger away.",
    evidence:
      "Screen recording showing down-event, movement, up-event and the activation point.",
  },
  "1.4.13": {
    web: [
      "Focus a tooltip trigger using the keyboard, then try to dismiss the extra content without moving focus.",
      "Hover the pointer over trigger and tooltip; check that the tooltip remains visible while hovered and does not disappear prematurely.",
    ],
    mobile: [
      "For native popovers and help views, verify that users can perceive and dismiss the information with accessibility focus and touch.",
      "Do not assume web hover mechanics exist in a touch-only native interface.",
    ],
    commonFailure:
      "A help tooltip disappears as soon as the pointer moves from the info icon to the tooltip itself.",
    evidence:
      "Screen recording of focus/hover/dismissal and whether the content obscures controls.",
  },
  "2.1.1": {
    web: [
      "Disconnect the mouse and use Tab/Shift+Tab, Enter, Space, arrows and Escape as appropriate to complete every key task.",
      "Include custom dropdowns, date pickers, drag interfaces, file uploads, dialogs and validation errors.",
    ],
    mobile: [
      "Use a physical keyboard or supported alternate-input mechanism to operate representative native flows.",
      "Document that mobile-specific platform accessibility requirements may extend beyond the web criterion.",
    ],
    commonFailure:
      "A custom calendar date can be selected only by tapping; arrow keys and Enter do nothing.",
    evidence:
      "Record input method, focus sequence, keystrokes and the unavailable action.",
  },
  "2.1.2": {
    web: [
      "Move focus into each composite widget, dialog, embedded frame and media player.",
      "Use documented keys to exit; confirm the focus does not become trapped in content and that any unusual key sequence is explained.",
    ],
    mobile: [
      "Check hardware-keyboard and assistive-focus navigation through overlays and native nested views.",
      "Make sure the user can navigate away from an overlay and return to the previous task.",
    ],
    commonFailure:
      "Tab cycles indefinitely within a custom widget and no keyboard command or instruction allows exit.",
    evidence:
      "Reproduce the exact focus loop and capture keyboard events or screen recording.",
  },
  "2.4.3": {
    web: [
      "Tab through the complete transaction in reading order; open and close dialogs and inspect focus return.",
      "Trigger errors, progressive disclosure and route changes, then verify focus follows a meaningful sequence.",
    ],
    mobile: [
      "Check hardware-keyboard focus and VoiceOver/TalkBack order independently, because they are not the same interaction model.",
      "After dismissing a modal, verify the user's place in the journey is preserved.",
    ],
    commonFailure:
      "After closing a modal, focus jumps to the start of the page rather than an appropriate location in the active task.",
    evidence:
      "Record focus sequence before/after the interaction and screen recording of the location change.",
  },
  "2.4.7": {
    web: [
      "Navigate by keyboard through links, inputs, action buttons and custom controls.",
      "Verify a perceptible focus indicator exists on every keyboard focusable component, including when a hover-only style is absent.",
    ],
    mobile: [
      "If the native app supports hardware keyboard navigation, inspect focus presentation; separately check accessible focus with screen reader.",
      "Do not conflate screen-reader focus behavior with the web's keyboard focus success criterion.",
    ],
    commonFailure:
      "The custom CSS removes the default outline and supplies no replacement for keyboard users.",
    evidence:
      "Capture the focused component and its corresponding unfocused state.",
  },
  "2.4.11": {
    web: [
      "Tab to controls near sticky headers, sticky footers, banners and open overlays, at each relevant viewport size.",
      "Verify the focused component is not entirely obscured; this AA rule does not require it to be completely visible.",
    ],
    mobile: [
      "For non-web controls, check focus visibility around fixed bottom sheets and overlays using relevant input technologies.",
      "Refer to WCAG2ICT for applicability; do not assume that VoiceOver accessibility focus is identical to keyboard focus.",
    ],
    commonFailure:
      "A fixed bottom bar entirely covers the focused Submit button as Tab reaches it.",
    evidence:
      "Screen recording with focus location, overlay position and viewport dimensions.",
  },
  "2.4.12": {
    web: [
      "Repeat the 2.4.11 focus check, but require the entire focused component to remain unobscured by author content.",
      "Account for the criterion's notes on repositionable content and user-opened interfaces.",
    ],
    mobile: [
      "Review occlusion of focused native components by app-authored overlays using applicable non-web guidance.",
      "Keep the enhanced AAA requirement distinct from the AA minimum.",
    ],
    commonFailure:
      "A floating banner covers the bottom half of the keyboard-focused control.",
    evidence:
      "Side-by-side screenshot of the focused component with the occluding layer.",
  },
  "2.4.13": {
    web: [
      "Inspect the indicator relative to its unfocused appearance; compare the same pixels for at least 3:1 contrast change.",
      "Calculate indicator area using an equivalent 2 CSS pixel perimeter, accounting for applicable exceptions.",
    ],
    mobile: [
      "Inspect hardware-keyboard focus indicators and compare visual distinction across states.",
      "Treat the specific CSS-pixel area method as a web technique unless a non-web adaptation is applicable.",
    ],
    commonFailure:
      "A one-pixel low-contrast outline replaces the browser focus indicator and is barely visible.",
    evidence:
      "Measure indicator dimensions/area, focused/unfocused colors and computed contrast change.",
  },
  "2.5.3": {
    web: [
      "Compare the visible text of every labeled button and link to its computed accessible name.",
      "Verify speech-input users can reference the visible label; keep its words in the accessible name in the same order when possible.",
    ],
    mobile: [
      "Compare visible CTA text with the VoiceOver/TalkBack label or accessibility tree name.",
      "Test representative commands with Voice Control or Voice Access where supported.",
    ],
    commonFailure:
      "The visible button says 'Search flights', but the accessible name is 'Continue'.",
    evidence:
      "Visible label, computed accessibility name, and a speech-input reproduction if available.",
  },
  "2.5.7": {
    web: [
      "Find all reorder, drag-to-select, carousel, map and slider interactions requiring drag movement.",
      "Verify a single pointer can achieve the same result without dragging, unless the underlying action genuinely needs dragging.",
    ],
    mobile: [
      "For swipe/drag rearrangement, test tap-operated move controls or accessible actions alongside the gesture.",
      "Verify the alternative works without multi-touch or path-dependent dragging.",
    ],
    commonFailure:
      "A list can only be reordered by dragging a handle; no other single-pointer action exists.",
    evidence:
      "Record the drag workflow and demonstration or absence of an alternative.",
  },
  "2.5.8": {
    web: [
      "Measure the actual clickable bounding box in CSS pixels, including invisible hit padding, rather than the drawn icon.",
      "For targets smaller than 24 × 24 CSS pixels, apply the diameter-24-circle spacing test or document a specific exception; recheck after responsive changes.",
    ],
    mobile: [
      "Measure native hit regions and spacing in platform units, using WCAG2ICT and platform-specific touch guidance.",
      "Do not equate 24 CSS pixels with 24 dp or 24 iOS points without considering the environment and applicable standard.",
    ],
    commonFailure:
      "A 16-pixel close icon has no hit padding and sits directly beside another 16-pixel icon.",
    evidence:
      "Capture target bounds and neighboring targets with units, spacing method and any exception justification.",
  },
  "3.3.1": {
    web: [
      "Submit each form empty, then enter invalid values in different fields.",
      "Verify that each detected error identifies the affected field and explains the problem in text, not only through color or an icon.",
    ],
    mobile: [
      "Trigger validation using touch and VoiceOver/TalkBack; find the specific field error without relying on position.",
      "Confirm the message is reachable and associated to the field in the accessibility model where applicable.",
    ],
    commonFailure:
      "A field border turns red but no text identifies which input is invalid or why.",
    evidence:
      "Capture input, triggered error, field identifier and assistive-technology output.",
  },
  "3.3.2": {
    web: [
      "Review the form before submission. Confirm clear labels and advance instructions for required formats, restrictions and required fields.",
      "Navigate with a screen reader to verify instructions can be discovered and tied to the relevant input when needed.",
    ],
    mobile: [
      "Check visible field labels, prompts and format hints before typing on the software keyboard.",
      "Verify TalkBack/VoiceOver users can find those instructions and understand what is expected.",
    ],
    commonFailure:
      "The field requests a date in DD/MM/YYYY format, but the format is explained only after an invalid submission.",
    evidence:
      "Record the field's initial state, label/instructions and the accessibility output.",
  },
  "3.3.7": {
    web: [
      "Complete a multi-step process and note every field containing data already entered in an earlier step.",
      "Verify repeat information is prefilled or selectable, or document a valid essential/security/invalidity exception.",
    ],
    mobile: [
      "Run the same booking or registration process end to end, including navigation back and return to the flow.",
      "Observe whether prior choices persist or can be selected without retyping.",
    ],
    commonFailure:
      "The passenger name already entered in step one must be typed again in step four.",
    evidence:
      "Sequence of steps with supplied value, repeated request and available reuse mechanism.",
  },
  "3.3.8": {
    web: [
      "Test login, MFA, password recovery and reauthentication, including paste, autofill and password managers.",
      "Confirm that a cognitive test has a suitable assistance mechanism or a method that does not require it; evaluate the defined AA exceptions separately.",
    ],
    mobile: [
      "Test password manager/autofill, passkeys and account recovery where supported by the app.",
      "Verify that a user is not forced to memorize or transcribe codes without an allowed alternative/assistance.",
    ],
    commonFailure:
      "A form blocks pasting a verification code and offers no permitted assistance or alternative authentication method.",
    evidence:
      "Record exact authentication branch, available alternatives, input constraints and outcome.",
  },
  "4.1.2": {
    web: [
      "Inspect computed name, role and state in the accessibility tree for native and custom controls.",
      "Operate each component with keyboard and screen reader; ensure state/value changes are programmatically exposed.",
    ],
    mobile: [
      "Inspect accessible labels, traits/roles, states and actions in native accessibility inspection tools.",
      "Operate with VoiceOver/TalkBack and check announcements of expanded, selected, checked or adjusted values.",
    ],
    commonFailure:
      "A custom switch only announces 'Button' and does not expose its checked state.",
    evidence:
      "Accessibility-tree snapshot plus actual spoken output before and after state changes.",
  },
  "4.1.3": {
    web: [
      "Trigger asynchronous success/error/progress messages without changing focus.",
      "Use live-region semantics or native status roles where appropriate, then verify a screen reader presents the message without receiving focus.",
    ],
    mobile: [
      "Trigger success, error and progress updates while staying on the same screen.",
      "Confirm relevant messages are made available through platform notification/announcement mechanisms; do not impose HTML aria-live as a requirement on native code.",
    ],
    commonFailure:
      "A 'Saved successfully' toast disappears visually while a screen reader user receives no notification.",
    evidence:
      "Capture status message, relevant programmatic properties and screen-reader announcement timing.",
  },
};
