<p align="center">
   <img src="assets/raypass-icon.png" height="50" />
   <h1 align="center">RayPass</h1>
   <sub>Manage passwords through <a href="https://raycast.com/">Raycast</a> that just you and your laptop know.</sub>
 </p>

RayPass is a local password manager. Passwords are stored locally on the users hard disk in "documents". A user can create one or many documents, optionally encrypt them, then make as many password records as they please inside them. Users can create, delete, search, and switch between documents. A user can also create, edit, delete, or copy each individual field of a password record. 
 
 https://user-images.githubusercontent.com/72945168/193752304-b2292fd1-c663-4ae6-baf5-3ef3f8c45998.mov

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
  secret: string;
  url?: string;
  notes?: string;
}
```
