<p align="center">
   <img src="assets/raypass-icon.png" height="50" />
   <h1 align="center">RayPass</h1>
   <sub>Manage passwords through <a href="https://raycast.com/">Raycast</a> that just you and your laptop know.</sub>
 </p>


## Features

- General
  - Unlimited number of documents and records (your hard drive is the limit)
  - Designed to not waste your time - Fast workflow and lookup

- [Documents](#documents)
  - Create, delete, switch between, and search documents
  - Optionally encrypt (AES-256) document and access with a password

- [Records](#records)
  - Create, edit, delete, and search records
  - Copy each individual field to clipboard and Open URL in browser
  - Favicon from URL is automatically fetched and displayed

## Understanding the components

### Documents

Documents are locally stored files that contain your passwords. You can create, optionally encrypt, and switch between documents to manage your passwords.

### Records

Records are the actual passwords that you want to store. You can create, edit, and delete records inside an individual document. Each record follows the following format:

```typescript
export interface Record {
  id: string;
  name: string;
  username?: string;
  email?: string;
  password: string;
  url?: string;
  notes?: string;
}
```