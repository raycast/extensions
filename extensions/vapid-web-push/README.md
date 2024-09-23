# VAPID Web Push


## Use Case

1. Test Web Push Notifications in development.
2. Test Web Push Notifications on a live server.

## Implementing Web Push Notifications

[Push API Docs](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)

[Next.js Guide](https://nextjs.org/docs/app/building-your-application/configuring/progressive-web-apps#2-implementing-web-push-notifications)

## Generating VAPID Keys

[Generate keys](https://vapidkeys.com/)

VAPID keys are used to authenticate your server with the push service. They consist of a public and private key pair. The public key is used to encrypt the push message, while the private key is used to sign the message.

The public key is sent to the push service when subscribing a user to push notifications. The private key is used to authenticate your server when sending push messages.
