# Manage Firebase Firestore Collections

Extension to export and import Firestore Collections (backup and restore). Including using Spark (free) subscription.

## Preferences

This extension needs only a few configurations.

### Firebase Authentication File

You need to retrieve a private key to connect to your Firebase projet.
For this, open your project and go to [admin SDK](https://console.firebase.google.com/project/_/settings/serviceaccounts/adminsdk).
Here you will be able to generate a new private key.

Download the JSON authentication file. This file is the file to use in this preference.

### Storage location for Export

Where exported collections will be stored.

### Collections to export

The list of collections to export (separated by comma)

### One file for each collection

This option allow to export each collection in a separated file

### Limit of exported documents

Limit the number of documents when exporting
Default Value: 0 (unlimited)

# Acknowledgements

Thanks to [dalenguyen](https://github.com/dalenguyen) for his library [firestore-export-import](https://www.npmjs.com/package/firestore-export-import) used in this extension.