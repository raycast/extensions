# Tana extension for Raycast

## Commands

### Quick Add

Write a note in Raycast and and send it to Tana!
The note that you write will be added to your **Inbox**.

To configure this in Raycast, you'll need to provide an API token which can be generated in Tana. 

*Note: currently only plaintext notes are supported.*

### Generate API token in Tana
Please follow instructions in [Tana Documentation](https://help.tana.inc/tana-input-api.html) to generate a token.
Once generated, paste the token into the corresponding configuration in Raycast.

If you have used this plugin before(in 2022), you also need to do the same thing since Tana have updated their API.
![](./media/change-extension-configuration.png)


### Contribution

```bash
npm install
# dev
npm run dev
# publish
npm run publish
# pull contributions
npx raycast/api@latest pull-contributions
```

[Tana input api sample](https://github.com/tanainc/tana-input-api-samples)

[Tana import tool](https://github.com/tanainc/tana-import-tools)

