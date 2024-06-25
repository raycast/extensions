# Rabbit Hole

Discover and manage information your Rabbit r1 has saved in your rabbit hole journal.

## Getting your access key
Rabbit utilizes an authentication platform called Auth0, with a CAPTCHA in front of it provided by Cloudflare, which makes logging into your account much more secure. However, this means that interacting with your data over their API isn't as streamlined as other apps.

To get around this, we can log into the rabbithole and follow these steps:

1. Log into the rabbit hole from the link above
2. Press F12 to bring up the developer console. If this doesn't work, right-click the page, and click inspect.
3. Expand the developer console for better viewing
4. Click the Network tab in the top navigation bar.
5. Press Ctrl + R to reload the page.
6. Near the bottom of the middle pane, find and select fetchUserJournal.
7. In the new pane that opened, select Payload in the top navigation bar.
8. Select everything inside the quotes after accessToken. This is your user token. Note: Your token will expire 24 hours after you log in. This is out of our control but we are working on a better way.

## Why is my name a required field?
Your access key normally expires in 24 hours. However, whenever your account name is updated, this token gets refreshed. This extension uses a no-view command in the background to refresh your account name in the rabbit hole every 4 hours to ensure that you don't get logged out.

## Help! I am no longer able to access my journal data
It is most likely that your access key has expired. If you stepped away from your machine for an extended amount of time, or quit Raycast from running, it is possible your access key wasn't able to be renewed. Follow the steps in the "Getting your access key" to add it back in again.

## Scratchpad
https://rabbit-prod-user-journal.s3.us-west-2.amazonaws.com/auth0%7C6660ac98638a534c6a3ce1e6/1717709417910-magic-camera.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAXYKJTMUYU7EMVP77%2F20240606%2Fus-west-2%2Fs3%2Faws4_request&X-Amz-Date=20240606T221145Z&X-Amz-Expires=3600&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEFYaCXVzLXdlc3QtMiJHMEUCIQDVHwZWE73%2F7scLAPbE%2F9yIspuroaoCq79bBwZwt9321AIgUrnliQ987BFzsM%2BxOer%2FR3SQMIEkamLhmJ%2B4WXO5mBkqjgUI3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw1MzMyNjcxNzg4MDEiDHhR9qEk6aFjJ1BvcyriBGWI8Grx9jBHGQB8jCE%2BY8Wzz4qhjKwGkR5pkUXmW0SMbuCNF7mN%2BaMvDc1BsTydBxLSleyIsWhGKGfRJH2JacGje8bLA2oLpcsM5Edmg110lkP4bnf0VWatdX8q%2FoUkKqJKMwRkYtIxESzHEVoq9vWoopNMe%2F1bw9lkl%2FW8P36%2FpUX7jQKVfg3k%2FcablPY3OOirNiabbO%2Bplk7QLt9km4kFTBHhJAur3BtEdNGfF0o9hb5YHWthm9kivL7fnjEyejqhs%2B6OBGVWAk9X5bi17up2fju47KrlLp8NWXCTLS%2FZLJToHLca%2FJGKyZBRkb%2BxL0MLi%2BRZOE85FJe4lHegrgnyXjmcp7aq9f44Q%2F48bmMAuZ8rcITO%2Fpv41Ubf15kYtgqWAc%2BZ0Pv1ClHAOpYrUq5dQKbkYtga4dpiWuojAgYfiq3vMOktwz%2BrKeG%2BdpYXRQskoohnSkp2QLy2t8QpCZEsS1ewdSLAjDYuaF44Xbe62J2G5sQ5fI9EzjG6EacGToegInJa4fSpyIZJCrY6t46RdE9fNw7%2Bhenb9B81KM%2FcbUhfuQihAWRuzBw%2BwcTyku8e88Zu9nbZnhd8uNNu%2B68NoYbXuEf2LSMOvvzHXjyyPOAn2EHg%2Bkjn84Hts4MP0im5bHUvSE4WEf6oqePykyQWx501PlQ9KLlqyeAlzRFQabl9uvR%2B9fQVtjl0CtoEN%2FtnrnRudKlwhDhwQBfvE%2FeTImUGETfkYpIYZsEjZHZEMr2fdQt0wprckbkkVH0%2FjQqNqPDYmVanYfzie1D6mYdAFPALkRs1K9h4ZyxWfS23Xc0w3OSIswY6mgEOjcceJcH7epZ3yxiV5I6TE53kXOw2LPvJX5vtHEQ%2Fsl%2BmPP93co9VriZJia9wVwd3sVyLGmHZn2V69syJ0DK0lLdIOT3QqcZDMZlAwOQ0KskpgfAJzb%2BMR47OBr1uc941zS4vWJQJM8Tm0KejqS2CFm%2BIqU2L3Dma1D7QUOzxYHOvNnjYo0UN6QTuTEe%2FEAUmFDguIoGgObdP&X-Amz-Signature=d08b8de994f677bdceb63877ca6f65d1fe59eed0cdd8a002ff924f0823d1e498&X-Amz-SignedHeaders=host&x-id=GetObject


https://rabbit-prod-user-journal.s3.us-west-2.amazonaws.com/auth0%7C6660ac98638a534c6a3ce1e6/1717709417910-magic-camera.jpg?
X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Content-Sha256=UNSIGNED-PAYLOAD&X-Amz-Credential=ASIAXYKJTMUYU7EMVP77%2F20240606%2Fus-west-2%2Fs3%2Faws4_request&
X-Amz-Date=20240606T221145Z&X-Amz-Expires=3600&
X-Amz-Security-Token=IQoJb3JpZ2luX2VjEFYaCXVzLXdlc3QtMiJHMEUCIQDVHwZWE73%2F7scLAPbE%2F9yIspuroaoCq79bBwZwt9321AIgUrnliQ987BFzsM%2BxOer%2FR3SQMIEkamLhmJ%2B4WXO5mBkqjgUI3%2F%2F%2F%2F%2F%2F%2F%2F%2F%2F%2FARAAGgw1MzMyNjcxNzg4MDEiDHhR9qEk6aFjJ1BvcyriBGWI8Grx9jBHGQB8jCE%2BY8Wzz4qhjKwGkR5pkUXmW0SMbuCNF7mN%2BaMvDc1BsTydBxLSleyIsWhGKGfRJH2JacGje8bLA2oLpcsM5Edmg110lkP4bnf0VWatdX8q%2FoUkKqJKMwRkYtIxESzHEVoq9vWoopNMe%2F1bw9lkl%2FW8P36%2FpUX7jQKVfg3k%2FcablPY3OOirNiabbO%2Bplk7QLt9km4kFTBHhJAur3BtEdNGfF0o9hb5YHWthm9kivL7fnjEyejqhs%2B6OBGVWAk9X5bi17up2fju47KrlLp8NWXCTLS%2FZLJToHLca%2FJGKyZBRkb%2BxL0MLi%2BRZOE85FJe4lHegrgnyXjmcp7aq9f44Q%2F48bmMAuZ8rcITO%2Fpv41Ubf15kYtgqWAc%2BZ0Pv1ClHAOpYrUq5dQKbkYtga4dpiWuojAgYfiq3vMOktwz%2BrKeG%2BdpYXRQskoohnSkp2QLy2t8QpCZEsS1ewdSLAjDYuaF44Xbe62J2G5sQ5fI9EzjG6EacGToegInJa4fSpyIZJCrY6t46RdE9fNw7%2Bhenb9B81KM%2FcbUhfuQihAWRuzBw%2BwcTyku8e88Zu9nbZnhd8uNNu%2B68NoYbXuEf2LSMOvvzHXjyyPOAn2EHg%2Bkjn84Hts4MP0im5bHUvSE4WEf6oqePykyQWx501PlQ9KLlqyeAlzRFQabl9uvR%2B9fQVtjl0CtoEN%2FtnrnRudKlwhDhwQBfvE%2FeTImUGETfkYpIYZsEjZHZEMr2fdQt0wprckbkkVH0%2FjQqNqPDYmVanYfzie1D6mYdAFPALkRs1K9h4ZyxWfS23Xc0w3OSIswY6mgEOjcceJcH7epZ3yxiV5I6TE53kXOw2LPvJX5vtHEQ%2Fsl%2BmPP93co9VriZJia9wVwd3sVyLGmHZn2V69syJ0DK0lLdIOT3QqcZDMZlAwOQ0KskpgfAJzb%2BMR47OBr1uc941zS4vWJQJM8Tm0KejqS2CFm%2BIqU2L3Dma1D7QUOzxYHOvNnjYo0UN6QTuTEe%2FEAUmFDguIoGgObdP&
X-Amz-Signature=d08b8de994f677bdceb63877ca6f65d1fe59eed0cdd8a002ff924f0823d1e498
&X-Amz-SignedHeaders=host
&x-id=GetObject



	1.	﻿X-Amz-Algorithm: Specifies the cryptographic algorithm used for the request signature (AWS4-HMAC-SHA256).
	2.	﻿X-Amz-Content-Sha256: The content checksum that Amazon S3 calculated for you. For the UNSIGNED-PAYLOAD value, no payload is included.
	3.	﻿X-Amz-Credential: Identifies the access key ID and the scope necessary for the signature as part of the AWS4 request.
	4.	﻿X-Amz-Date: The date and time in UTC when the request signature will expire.
	5.	﻿X-Amz-Expires: The time period in seconds for which the presigned URL will be valid.
	6.	﻿X-Amz-Security-Token: The security token obtained from temporary security credentials.
	7.	﻿X-Amz-Signature: The URL-encoded signature, verifying the request.
	8.	﻿X-Amz-SignedHeaders: The list of headers that were included in the signed request.
	9.	﻿x-id: A custom header used for identifying the object.




	2024-06-07T22:33:57.552Z
	2024-06-07T22:34:22.921Z