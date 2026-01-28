# Password Strength

Check your password strength with this extension

- It will compare a SHA-1 hash of your password with an online database. (It does NOT send your password to the server)
  - It hashes your password using [SHA-1](https://www.wikiwand.com/en/articles/SHA-1) and sends the first 5 characters of the hash to the server
  - The server will respond with a list of hashes and that is compared locally to see if your password might be in an online database (Courtesy of [haveibeenpwned](https://haveibeenpwned.com/Passwords))

- It will also check your password offline with common passwords and tell you the strength
  - This uses [zxcvbn](https://zxcvbn-ts.github.io/zxcvbn/)
  - You can select additional languages to check against. This will check if your password for example matches a common word, first name, last name, etc. in that language
