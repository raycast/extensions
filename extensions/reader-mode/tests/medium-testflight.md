# How to deploy TestFlight app from Codex Web automatically

*Thomas Ricouard • Medium*

---

> **Summary (Overview)**
>
> [Automate building, testing, and deploying a TestFlight iOS app from Codex Web by running cloud builds with Xcode Cloud and testing PR-driven changes without local tooling.]
> 
> - Cloud-based builds with Xcode Cloud from Codex Web enable testing PRs on iOS devices without local compilation.
> - The workflow supports an end-to-end process: edit code, run cloud builds, test on-device, and deploy to TestFlight.
> - The setup example with Ice Cubes (an open-source Mastodon client) illustrates configuring Codex Web and iOS environments for this cloud-based workflow.

---

![](https://miro.medium.com/v2/resize:fit:1200/1*c6EUIOQ1xkCR2fYDg0G2YA.png)

# How to deploy TestFlight app from Codex Web automatically

## Using Xcode Cloud workflow

[Thomas Ricouard](https://dimillian.medium.com/?source=post_page---byline--1de715248269---------------------------------------)

One of the downsides of native iOS development compared to something like Expo is that the tooling for building and releasing an app is a bit more involved.

Unfortunately, we can’t hot reload from a new JS bundle, and we don’t have the nice [Expo Go](https://expo.dev/go) toolchain.

But with agentic engineering and especially web/iOS versions of Claude Code and Codex, being able to test a build from a PR made in the cloud without building locally has become a necessity.

It means you can have a whole E2E flow where you can ask for the code to be edited, and be able to test your app (almost) right away on your iOS device. Coding, texting, and deploying native mobile apps on the go is no longer a dream!

Let me show you my setup for [Ice Cubes,](https://github.com/Dimillian/IceCubesApp) my open-source Mastodon client, when working with the web version of [Codex](https://chatgpt.com/codex).

## Codex web and iOS

*ChatGPT iOS app Codex tab*

Whenever you start a task on Codex, it’ll run in their cloud using the [environment](https://chatgpt.com/codex/settings/environments) you configured for your repository.

You need to configure those once you have connected your GitHub for Codex to be able to work on your codebase remotely.

You can even decide if the agent has access to the internet, etc.

Once Codex is done with a task, you can open it to see the details, the diff, and you’ll see a button to create a PR on your GitHub repository.

Once the PR is created, it’ll be on a branch prefixed by codex/ which is a very useful thing to note for us, as we’ll be able to setup workflow related to branches and PR opened with this prefix

*Exaple of a PR opened from Codex Web*

Enter [Xcode Cloud](https://developer.apple.com/xcode-cloud/)

## Xcode Cloud

[Xcode Cloud](https://developer.apple.com/xcode-cloud/) has become my favorite CI, mainly because it just work. I don’t need to write or set up CI scripts that I have to run many times before they’re correct.

I can use their UI to create a workflow. This UI is available directly within Xcode and through App Store Connect.

Let’s make a workflow to deploy a TestFlight when a PR made from Codex is opened. First, navigate to the cloud tab of the Xcode left sidebar:

Then right click and select manage workflow

From there you can edit, delete or create new workflow

Let’s hit the + button at the bottom of this panel

Here I’m setting the name to Codex TestFlight.

Then select the Start Condition section, click the + button, select “Pull Request Changes”, and then you can go ahead and delete the default “Branch Changes” condition.

Your window should now look like that:

Now hit the + button in the source branch, type “codex/” and select “branches beginning with codex/”

Now your workflow might look like something like that

Then click the + near the Actions section and select “Archive”

Select your platform, the scheme you want to archive and TestFlight for the Distribution Preparation

And finally hit the + in the last section and select TestFlight Internal Testing

For this to work, you’ll need to add a group, which can only be created in App Store Connect, within your app's TestFlight section.

Basically, I’ve created a me group with just me, so those builds are only sent to my TestFlight and not all my other testers.

But from there, what you can do is pretty customizable. You could have a [CI script](https://developer.apple.com/documentation/xcode/writing-custom-build-scripts) that sets a specific version for your app, so TestFlight made from those Codex branches doesn’t pollute your main build.

Or even better, you could have another “staging” app setup that is not the same App Store Connect item as your main app, so you have two separate applications on your phone. One for your main branch and one app specific for when you want to test and compare a Codex branch.

The possibilities are endless, but I have given you the basics on how to set up that kind of workflow.

## Opening a PR

The next step is to ask Codex to edit some so it can create a task from the iOS app (ChatGPT app) or the web interface.

Here, I’ve requested to add an event to [TelemetryDeck](https://telemetrydeck.com/), the framework I use for analytics in Ice Cubes.

*Codex web Task interface*

Now I can hit the Create PR button in the top right corner to get the PR created on my GitHub repository

*GitHub web PR interface*

And here it is! We can see our freshly created Codex Testflight workflow being triggered (among my other test workflows), so it means that in a few minutes, I’ll have a TestFlight build, ready to test on my device.

Happy Shipping! 🚀