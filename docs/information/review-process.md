---
description: Understand how the Raycast team reviews your extension.
---

# Review process

Thank you for your interest in contributing to the Raycast Store! Before an extension can be listed in the Store, it needs to go through our review process. This guarantees a safe and high quality ecosystem.

To make the submission process smooth and simple, we have created a set of guidelines. This document outlines what is required to get your extension approved.

### Guidelines

There are six steps in the review process:

#### Configuration

* We check if everything is set up correctly in `package.json` and file structure.
  * Most of the issues should be caught by GitHub checks
  * `author` specified in `package.json` and person submitting the PR is the same \(for new extensions\).
    * If it's a contribution to an existing extension built by somebody else, we'll tag the original author to see if they are okay with the changes.
  * the `license` should be set up to `MIT` in `package.json`
    * There is no need to add `LICENSE` file for your extension. We have `MIT` license at the root of the repo and by submitting your extension you agree to this.
* We check if your extension has an icon of proper format and size
  * Supported formats: PNG, JPEG
  * Required size: 512x512px
  * _Dark / light variant has the proper format_

#### Functionality

* We run your extension to see if it does what it says it does
  * The extension should be generally useful to the target audience, i.e. it shouldn't contain assumptions to a specific setup. For example, you can't have a hardcoded team id in the Figma extension that works only for your team or have a hardcoded file path that will only work on your machine. Consider using preferences to avoid these issues.
* We check if there is already an extension in the store that does similar thing. Please make sure to explain how your extension is different from the other similar one?

#### Quality Assurance

* We perform basic testing to see if it's bug-free for crucial user journey

#### Security

* We run checks on whether there are any security and privacy issues in your extension code, such as:
  * Accessing user's data that is not meant to be accessed for declared functionality of the extension
  * Running code that does something malicious
  * Having dependencies with known vulnerabilities
  * Performing user tracking
  * Having hardcoded API keys or tokens

#### Design and usability

* We take a look at UX of the extension to ensure it feels in place along with other Raycast extensions. Here are some areas we're going to check:
  * Extension Icon
    * Does it work well in both light and dark themes?
  * Extension, commands and actions naming
    * Extensions, commands and actions should follow Capital Case convention
  * Navigation patterns
  * Action panel and shortcuts
  * Preferences
  * Authentication
  * Error handling
  * Performance
    * Caching / Snappiness
    * Does it consume a lot of resources?

#### Legal

* Extensions are expected to comply with the law. It is ultimately your responsibility to make sure that your extension is not doing anything illegal. You should consult with a lawyer if you are unsure about something.

