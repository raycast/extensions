# Simple Reminder

Set your reminders in plain english without the need to have any application installed and be notified when the time is right!

## Example usage

> remind me to speak with Jane on May 18th at 6pm
> 
> remind me to buy lunch today at noon
> 
> remind me to schedule the hotel for the weekend this friday at 7pm

## Screenshots

![Demo 1](metadata/simple-reminder-1.png)
![Demo 2](metadata/simple-reminder-2.png)
![Demo 3](metadata/simple-reminder-3.png)
![Demo 4](metadata/simple-reminder-4.png)

## Mobile notifications

Sometimes we're simply not near our mac when a reminder is up. Being able to receive these reminder notifications in the mobile is a blessing and really useful.

Simple Reminder offers this feature through a mobile application called [ntfy](https://docs.ntfy.sh/). This is a mobile application that lets you subscribe to topics and receive notifications of messages that are sent to those topics.
With the app installed, you simply need to go to the preferences panel of the Simple Reminder extension, check the `Mobile notifications with ntfy` and set the ntfy `topic` to send the notifications to.

![ntfy-1.png](media/ntfy-1.png)

This handles the extension side of things. The next step involves your mobile device.

Simply download ntfy from [Google Play](https://play.google.com/store/apps/details?id=io.heckel.ntfy) or from the [App Store](https://apps.apple.com/us/app/ntfy/id1625396347) and subscribe to the topic that you just defined in the extension. As simple as that.


<img src="https://media.giphy.com/media/v1.Y2lkPTc5MGI3NjExODQxOTU2ODk1ZDNkZGIxMDliNDUxMDI5MjBlZWVlYWMyZjgwZWFmNyZlcD12MV9pbnRlcm5hbF9naWZzX2dpZklkJmN0PWc/upd24i7KoatmzLw34v/giphy.gif" width="400">

![ntfy-3.png](media/ntfy-3.png)

You're all set to receive your Simple Reminder's in your mobile device!

## Limitations

When you install the extension, notifications will by default be non-sticky. Which means that they will display on your system, and after a second or two, they will go away from the screen and only stay in the notification center.

To change the behaviour so that the system notification will remain in the screen until you dismiss it, you will need to do two things:

> 1. Open the system preferences and go to "Notifications & Focus"
> 2. Go to the "Script Editor" and change the notification type from "Banners" to "Alerts"

![Pref 1](media/pref-1.png)
![Pref 2](media/pref-2.png)
