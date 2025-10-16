# Raycast Bard AI
A free and easy way to access Bard, on Raycast.

## Obtaining Authentication

1. Log in to your Google account, and visit [Google Bard](https://bard.google.com)
2. Open the Web Inspector, and go to the "Application" tab.
3. Click open the `Cookies` dropdown on the sidebar, under storage, and click on the option that says `https://bard.google.com`.
4. Look for and copy the Cookie labeled `__Secure-1PSID`. Make sure you copy the periods at the end as well.

That's it! Now, put `__Secure-1PSID` in the setup screen and you're all good!

> **Warning**
> It is probably a good idea not to commit this `COOKIE_KEY`, though there doesn't seem to be a direct way to exploit it as far as I am concerned.