## Setup Extension

### Create Notion Integration

Go to [Notion > My Integrations](https://www.notion.so/my-integrations) and create a new integration.

1️⃣ Give it a name, 2️⃣ select the Notion workspace you want to access from Raycast and 3️⃣ submit it.

<img width="1680" alt="Screenshot 2021-11-06 at 09 48 32" src="https://user-images.githubusercontent.com/18643714/140604550-f05036af-7db0-436a-82fb-5b16bf04e0e5.png">

### Copy Notion Token

Once saved, copy the `secret_xxxxx` token and save it in Raycast extension's preference under `Notion Token`.

<img width="1680" alt="Screenshot 2021-11-06 at 09 50 21" src="https://user-images.githubusercontent.com/18643714/140604577-9e64459f-12be-4a2c-9283-3fbddb8cdbfb.png">

### Share Database

Now go into your workspace, find a database you want to use with Raycast and `Share` this database with your newly created Notion integration.

<img width="1680" alt="Screenshot 2021-11-06 at 09 54 13" src="https://user-images.githubusercontent.com/18643714/140604616-23b7e76f-2023-41fa-a60f-e24a6cd5ed24.png">

You're all set 🙌
Go back to Raycast to start using the extension.

## Create Database Item

![raycast-notion-create-database-item-banner.png](screenshots/raycast-notion-create-database-item-banner.png)

From Raycast, type `Create Database Item` to load the command and select a database.

All editable fields will be retrieved from this database.

As of today, here are the compatible properties:

- ✏️ Text
- 📞 Phone number
- ✉️ Email
- 🔢 Number
- 🔻 Select
- 🏷 Multi-select

And coming soon:

- 👥 People
- 🔀 Database relations
