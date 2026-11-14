import type { Criterion } from "./types";
import { passConditions } from "./pass-conditions";

type ReviewedGuidance = {
  plain: string;
  technical: string;
  benefits: string;
  scope: string[];
  implementation: string[];
  tests: string[];
  pass: string;
  automation: string;
  failures: string[];
  related: string[];
};

type Override = Partial<Omit<ReviewedGuidance, "implementation" | "tests">> & {
  implementation?: string[];
  tests?: string[];
};

const guidelineBenefits: Record<string, string> = {
  "1.1":
    "People with visual disabilities and people using text-only interfaces can access equivalent information.",
  "1.2":
    "People with hearing or visual disabilities can access information presented through audio or video. Alternatives also help anyone who cannot play the media in their current situation.",
  "1.3":
    "People with visual or cognitive disabilities can understand the structure and relationships in the content. This is especially important when someone uses a screen reader or changes the original presentation.",
  "1.4":
    "People can adjust the presentation to meet their visual or hearing needs. Clear contrast and controlled motion can also reduce fatigue and discomfort.",
  "2.1":
    "People with motor disabilities can operate the interface without relying on a mouse or precise touch. This supports keyboard access and other alternative input methods.",
  "2.2":
    "People who need more time can read information and complete tasks without losing their work. This supports people who process information or operate controls at a different pace.",
  "2.3":
    "People with photosensitive epilepsy or vestibular disabilities can use content without harmful flashing or motion.",
  "2.4":
    "People can find content and understand where they are in an interface. Clear navigation and visible focus are especially helpful to keyboard and screen-reader users.",
  "2.5":
    "People with motor disabilities can complete actions without precise or complex pointer movements. The same action should remain available through the different input methods supported by the product.",
  "3.1":
    "People can understand the language and meaning of the content. Correct language information also helps assistive technology pronounce words accurately.",
  "3.2":
    "People who rely on predictable interfaces can act without unexpected changes. This reduces the risk of becoming disoriented or losing work.",
  "3.3":
    "People can understand what information is expected and recover when something goes wrong. Clear assistance reduces memory demands and makes important tasks easier to complete.",
  "4.1":
    "People using assistive technology receive reliable information about controls and changes on the page. This supports screen readers as well as speech and switch input.",
};

const automationByGuideline: Record<string, string> = {
  "1.1":
    "Automated tools can find missing or empty alternatives and some naming problems, but a person must judge whether the alternative conveys the same purpose.",
  "1.2":
    "Automation can detect some media tracks and markup. A person still needs to compare the alternative with the media and judge whether it is accurate, synchronized, and complete.",
  "1.3":
    "DOM and accessibility-tree checks can expose missing semantics and attributes. A person must still judge whether the reading order and relationships preserve the intended meaning after the presentation changes.",
  "1.4":
    "Tools can measure some contrast and style properties. Manual testing is needed when backgrounds are complex and when the result depends on responsive layout, zoom, animation, or user interaction.",
  "2.1":
    "Automation may flag invalid roles or focusable elements, but only end-to-end keyboard and assistive-input testing can establish operability.",
  "2.2":
    "Scanners provide little reliable coverage for timing requirements. Let each timer run, use the available controls, and confirm that the person's work and current position are preserved.",
  "2.3":
    "Use a dedicated flash-analysis tool for video and animation. Reduced-motion and interaction behavior still require manual verification.",
  "2.4":
    "Scanners can find some missing titles and structural problems. A person must still judge whether navigation makes sense and whether focus remains visible in the correct order throughout each task.",
  "2.5":
    "Most pointer and gesture requirements need manual testing. Perform each action with the supported input methods and repeat the test on representative devices and viewport sizes.",
  "3.1":
    "Automation can validate language attributes and some document structure. A person must judge whether the content is clear and whether definitions or pronunciation guidance are effective.",
  "3.2":
    "Predictability and changes of context are primarily behavioral and must be tested manually across pages and component states.",
  "3.3":
    "Scanners can find some missing labels and error associations. Complete the actual form and authentication flows to judge whether instructions are useful, errors can be corrected, and information is not requested unnecessarily.",
  "4.1":
    "Accessibility-tree and automated rule checks are useful, but custom widgets and live updates must also be operated with real assistive technology.",
};

const overrides: Record<string, Override> = {
  "1.1.1": {
    technical:
      "Every meaningful non-text item needs a programmatically determinable alternative serving the same purpose. Controls need a name; complex images need an equivalent explanation. Decorative content must be ignored by assistive technology. Media, tests, sensory experiences, and CAPTCHA have specific rules rather than one universal alt-text pattern.",
    scope: [
      "Decide what purpose the non-text item serves before choosing an alternative. An informative image needs different treatment from a control or complex chart. Decorative content should usually remain silent, while media and CAPTCHA have their own requirements.",
      "An empty alt attribute is appropriate only when the image adds no information or function. CSS background images carrying meaning still need an equivalent.",
    ],
    implementation: [
      "For complex charts, provide a concise accessible name plus the data or full explanation nearby.",
      "For CAPTCHA, describe its purpose and provide another modality; a generic image description is not enough.",
    ],
    pass: "Pass when every non-text item has an alternative that preserves its information or function, and purely decorative items are silent.",
  },
  "1.4.3": {
    technical:
      "Text and images of text need at least 4.5:1 contrast. Large text needs 3:1. Text qualifies as large at 18 pt, which is about 24 CSS pixels, or at 14 pt when bold, which is about 18.5 CSS pixels. Defined exclusions cover inactive or invisible text, purely decorative text, incidental text in an image, and logos. Do not round a measured result up to the threshold.",
    tests: [
      "Measure the computed foreground and underlying background colors; 4.499:1 fails a 4.5:1 requirement.",
      "Check text over images and gradients at the least favorable point. Include placeholder text and visited links. Repeat the measurement for validation messages and every interactive state.",
    ],
    pass: "Pass when every applicable text sample meets 4.5:1, or 3:1 when it qualifies as large-scale text, without rounding the result.",
  },
  "1.4.7": {
    technical:
      "Prerecorded speech-only audio can meet this criterion by having no background sound or by providing a way to turn that sound off. Another option is to keep non-speech sound at least 20 dB below the speech, apart from brief sounds. Defined exceptions cover audio CAPTCHA and audio logos as well as music and vocal performance.",
    scope: [
      "This applies to prerecorded audio that is primarily speech in the foreground.",
      "Do not apply the 20 dB rule to every recording without checking its purpose. Review the defined exceptions for music and vocal performance as well as audio CAPTCHA, audio logos, and brief incidental sounds.",
    ],
    pass: "Pass when speech-only content has no background audio, switchable background audio, or a verified difference of at least 20 dB outside allowed exceptions.",
  },
  "1.4.8": {
    technical:
      "For blocks of text, provide a mechanism that lets people choose the foreground and background colors. Lines must be no wider than 80 characters or glyphs, with a limit of 40 for CJK text. Text must not be fully justified. Line spacing must reach at least 1.5, and paragraph spacing must be at least 1.5 times that line spacing. At 200% text size in a full-screen window, a line must remain readable without scrolling back and forth.",
    scope: [
      "The requirement is to make these presentations achievable; the page does not always have to use them by default, and the browser may provide the mechanism.",
      "A presentation setting that is not used in a writing system does not have to be forced onto that language.",
    ],
    tests: [
      "Verify 80/40-character line length, non-justified alignment, 1.5 line spacing, and paragraph spacing at least 1.5 times the line spacing.",
      "Resize text to 200% in a maximized desktop window and confirm a line can be read without repeated horizontal scrolling.",
    ],
    pass: "Pass when users can achieve every required presentation setting without losing content or functionality.",
  },
  "1.4.11": {
    technical:
      "Visual information needed to identify an active control or understand its state must have at least 3:1 contrast against adjacent colors. The same threshold applies to the parts of a graphic needed to understand its meaning. Defined exclusions cover inactive controls, unmodified user-agent presentation, and graphics whose exact appearance is essential. A visible boundary is required only when people need it to identify the control.",
    tests: [
      "Measure the visual cue needed to find or understand the component, not automatically every border or hit-area edge.",
      "Identify the visual part that communicates the control or state, then measure it against the adjacent color. Apply this to selected states and meaningful icons as well as chart lines and focus cues. A result of 2.999:1 does not meet a 3:1 threshold.",
    ],
    pass: "Pass when every visual cue required to identify a control, state, or meaningful graphic reaches 3:1 against adjacent colors or fits a documented exception.",
  },
  "1.4.10": {
    technical:
      "Content that normally scrolls vertically must work at a width equivalent to 320 CSS pixels. Content that normally scrolls horizontally must work at a height equivalent to 256 CSS pixels. Information and functionality must remain available without scrolling in two directions. A section may use two-dimensional scrolling when its layout is essential to its use or meaning.",
    scope: [
      "The exception applies only to a section that genuinely needs a two-dimensional layout. A data table or map may qualify because its spatial relationships carry meaning. Video, games, diagrams, and editing canvases can also qualify when reflow would remove information or functionality.",
      "Text and controls around an excepted section still need to reflow. Text inside a table cell also needs to reflow unless its own presentation requires two dimensions.",
    ],
    implementation: [
      "Let text wrap, allow components to stack, and avoid fixed widths or minimum widths that push ordinary content outside the viewport.",
      "Place large tables and other excepted regions in their own scrollable containers when practical, while keeping surrounding content within the viewport.",
    ],
    tests: [
      "For vertically scrolling content, test a viewport 320 CSS pixels wide. A 1280 CSS pixel wide viewport at 400% zoom is a common equivalent.",
      "For horizontally scrolling content, test a viewport 256 CSS pixels high. Check that every non-excepted section can be read and operated by scrolling in only one direction.",
    ],
    pass: "Pass when all information and functionality remain available at the required viewport size and only sections that need a two-dimensional layout require scrolling in both directions.",
    failures: [
      "A fixed-width page forces people to scroll sideways for each line of ordinary text.",
      "A table is treated as an exception, but nearby headings, filters, or pagination also extend outside the viewport.",
    ],
    related: ["1.4.4 Resize Text", "2.4.11 Focus Not Obscured (Minimum)"],
  },
  "2.2.1": {
    technical:
      "For each time limit controlled by the content, provide one of the allowed forms of control. A person can turn the limit off before encountering it or adjust it beforehand to at least ten times the default. Alternatively, warn the person with at least 20 seconds remaining and allow a simple extension at least ten times. Real-time and essential limits are exceptions. A limit longer than 20 hours is also exempt.",
    tests: [
      "Verify the adjustable range reaches at least 10× the default, or the warning allows at least 20 seconds and at least ten extensions.",
      "Confirm extension restores the exact task state and that real-time, essential, or 20-hour exceptions are documented rather than assumed.",
    ],
    pass: "Pass when every applicable limit offers one complete compliant option, or a documented normative exception genuinely applies.",
  },
  "2.2.2": {
    technical:
      "Moving, blinking, or scrolling content needs a control when it starts automatically, lasts more than five seconds, and appears alongside other content. Let the person pause, stop, or hide it unless the movement is essential. Automatically updating content also needs control when it starts on its own and appears alongside other content. Let the person pause, stop, or hide the updates, or choose how often they occur, unless the update is essential.",
    scope: [
      "The five-second threshold applies to moving, blinking, and scrolling content. It does not limit the requirement for automatically updating content.",
      "Content shown before a page finishes loading is not covered when everyone must wait and no other content is presented at the same time.",
    ],
    implementation: [
      "Put the control near the moving or updating content and make it available as soon as the content begins.",
      "When paused, keep the current content available and do not restart it unexpectedly after another interaction.",
    ],
    tests: [
      "Watch the complete page long enough to identify anything that moves or updates by itself. Pay particular attention to carousels and tickers as well as animations, progress displays, and live feeds.",
      "Use each control with a keyboard and confirm the item remains paused, stopped, hidden, or updates at the chosen frequency.",
    ],
    pass: "Pass when every applicable item has an effective user control, or the movement or update is essential to the activity and that exception is documented.",
    failures: [
      "A carousel advances every few seconds with no pause control.",
      "A live feed can be paused visually, but new items continue to move keyboard focus or change the reading position.",
    ],
    related: ["2.3.3 Animation from Interactions", "2.2.1 Timing Adjustable"],
  },
  "2.3.1": {
    technical:
      "A page must contain nothing that flashes more than three times in any one-second period unless the combined flashing area stays below both the general flash and red-flash thresholds.",
    tests: [
      "Analyze the final rendered video, animation, transition, and game effect with a recognized flash-analysis tool.",
      "Test the largest likely viewport and worst one-second sequence; do not judge safety by visual inspection alone.",
    ],
    pass: "Pass when no content exceeds three flashes per second, or analysis confirms that both applicable flash thresholds are not exceeded.",
  },
  "2.4.13": {
    technical:
      "When visible, part of the keyboard focus indicator must have an area at least equal to a solid 2 CSS pixel perimeter of the unfocused component and at least 3:1 contrast between the same pixels in focused and unfocused states. Unadjustable user-agent indicators and indicators whose colors were not author-modified are exceptions.",
    tests: [
      "Use a solid 2 CSS pixel perimeter as the simplest reference, or calculate that an alternative indicator has at least the same area.",
      "Compare the same pixels before and after focus and verify at least 3:1; test every component and sub-component.",
    ],
    pass: "Pass when every author-styled focus indicator meets both minimum area and 3:1 change-of-contrast requirements, or a stated user-agent exception applies.",
  },
  "2.4.6": {
    technical:
      "When headings or labels are used, their text must describe the topic of the content or the purpose of the control. This criterion does not require a heading or label to be added in every possible place. Other criteria can still require labels, instructions, or programmatic relationships.",
    scope: [
      "Judge whether the wording helps a person find content or understand what an input or control is for.",
      "A heading or label can be concise. It does not need to describe every detail, but it must not be misleading or meaningless in context.",
    ],
    implementation: [
      "Use concrete headings that distinguish nearby sections and labels that state the information or action expected.",
      "Keep visible labels and accessible names aligned so visual, screen-reader, and speech-input users refer to controls consistently.",
    ],
    tests: [
      "Read the headings as an outline and decide whether each one identifies the section that follows.",
      "Review every visible label in context and confirm it identifies the input or action without relying on guesswork.",
    ],
    pass: "Pass when every heading and label that is present accurately describes its topic or purpose.",
    failures: [
      "Several sections use the same vague heading even though their topics differ.",
      "A field label says only 'Information' and does not tell the user what to enter.",
    ],
    related: ["1.3.1 Info and Relationships", "3.3.2 Labels or Instructions"],
  },
  "2.5.8": {
    technical:
      "A pointer target must be at least 24 by 24 CSS pixels. A smaller target can pass when it has enough space for the criterion's 24 CSS pixel circle test. Defined exceptions cover an equivalent control on the same page and a target constrained by the layout of running text. They also cover unmodified user-agent controls and presentations where the size or spacing is essential or legally required.",
    scope: [
      "Measure the actual interactive target, not only the visible icon. An invisible hit area can provide the required size.",
      "A link or other target within running text can use the dimensions imposed by the surrounding line instead of the 24 by 24 CSS pixel minimum.",
    ],
    implementation: [
      "Prefer hit areas of at least 24 by 24 CSS pixels. Increase padding without changing the visible icon when space is limited.",
      "Keep undersized targets far enough apart and recheck them when text wraps or the layout changes at narrow widths.",
    ],
    tests: [
      "Measure the rendered target boxes at every relevant breakpoint. Repeat the measurement when controls appear or change after hover and focus. Include controls introduced by validation or selection.",
      "For an undersized target, apply the 24 CSS pixel circle spacing test and confirm it does not overlap another target or another target's spacing circle.",
    ],
    pass: "Pass when every pointer target is large enough, has sufficient spacing, or fits one of the defined exceptions.",
    failures: [
      "A 16-pixel icon has a 16-pixel hit area even though the surrounding container looks larger.",
      "Small pagination links pass at one width but overlap each other's spacing areas after labels wrap.",
    ],
    related: ["2.5.5 Target Size (Enhanced)", "1.4.10 Reflow"],
  },
  "3.3.8": {
    technical:
      "An authentication step must not depend on an unaided cognitive function test. This includes remembering information, transcribing content, performing a calculation, or solving a puzzle. The step can pass when another method avoids the test or an effective mechanism assists the person. At Level AA, object recognition and recognition of the person's own non-text content are additional exceptions.",
    tests: [
      "Review every route that verifies identity. Include initial sign-in and multi-factor authentication as well as password reset, account recovery, and later re-authentication. Keep paste and password-manager autofill enabled during the test.",
      "Confirm every cognitive test has a non-cognitive alternative or effective assistance, and document any object or personal-content exception.",
    ],
    pass: "Pass when every authentication step is completable without unaided cognitive-function testing, subject only to the Level AA exceptions.",
  },
  "3.3.7": {
    technical:
      "During one process, information a person has already entered or provided must be filled in automatically or available for selection. Re-entry is allowed when it is essential, needed to protect security, or the earlier information is no longer valid.",
    scope: [
      "A process can span several pages or steps. The requirement applies while the person is completing that same activity, not to unrelated visits or a different process.",
      "The criterion concerns information previously supplied by the user. It does not require the service to obtain information it does not already have.",
    ],
    implementation: [
      "Carry values forward in multi-step forms and provide selectable saved information when automatic entry would be inappropriate.",
      "Allow people to review and change reused information. Do not turn a prefilled value into a locked field unless it genuinely cannot be changed.",
    ],
    tests: [
      "Complete each multi-step process and record every request for information that was entered earlier in that process.",
      "Confirm the repeated value is prefilled or selectable, or document why re-entry is essential, security-related, or required because the old value is invalid.",
    ],
    pass: "Pass when previously supplied information is reused or selectable throughout the same process, apart from a documented exception.",
    failures: [
      "A checkout asks for the same address again on a later step without offering the address already entered.",
      "A form clears valid information after a validation error and requires the person to type it again.",
    ],
    related: ["1.3.5 Identify Input Purpose", "3.3.2 Labels or Instructions"],
  },
  "3.3.9": {
    technical:
      "No authentication step may require a cognitive function test unless another authentication method avoids the test or a mechanism assists the user. Unlike 3.3.8, recognizing objects or user-provided images, audio, or video is not an exception.",
    tests: [
      "Complete sign-in and recovery using the alternative method and separately verify any assistance mechanism.",
      "Review every authentication path for a cognitive function test. This includes memory and transcription tasks as well as calculations and puzzles. At Level AAA, object recognition and recognition of personal content also need an alternative or an effective assistance mechanism.",
    ],
    pass: "Pass when every authentication step offers either a non-cognitive alternative or an effective assistance mechanism, with no recognition exceptions.",
  },
  "4.1.2": {
    technical:
      "Every interface component needs a programmatically determinable name and role. User-settable states, properties, and values must be programmatically settable, and changes must be exposed to user agents and assistive technology. Native controls usually provide this when used correctly; custom widgets require complete semantics and behavior.",
    tests: [
      "Inspect the accessibility tree, then operate native and custom controls with a screen reader, keyboard, and where relevant speech input.",
      "Verify that assistive technology can change every user-settable value. Then operate the component and confirm that updates are exposed. Include changes to focus and current value as well as states such as expanded, selected, checked, or pressed.",
    ],
    pass: "Pass when each component exposes its name and role, supports programmatic interaction with applicable user-settable states and values, and communicates relevant changes to accessibility APIs. Automatic speech is not required for every change.",
  },
};

function guidelineNumber(criterion: Criterion): string {
  return criterion.number.split(".").slice(0, 2).join(".");
}

export function reviewedGuidance(criterion: Criterion): ReviewedGuidance {
  const guideline = guidelineNumber(criterion);
  const override = overrides[criterion.number] ?? {};
  const implementation = [
    ...criterion.apply,
    ...(override.implementation ?? []),
  ];
  const tests = [...criterion.test, ...(override.tests ?? [])];

  return {
    plain: override.plain ?? criterion.plain,
    technical: override.technical ?? criterion.technical,
    benefits: override.benefits ?? guidelineBenefits[guideline],
    scope: override.scope ?? [],
    implementation: [...new Set(implementation)],
    tests: [...new Set(tests)],
    pass:
      override.pass ??
      passConditions[criterion.number] ??
      `Review every applicable instance of ${criterion.number} against the linked normative success criterion, including its exact exceptions.`,
    automation: override.automation ?? automationByGuideline[guideline],
    failures: override.failures ?? [],
    related: override.related ?? [],
  };
}
