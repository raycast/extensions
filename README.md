# Klu Raycast

## Development

1. Clone the repo by doing a sparse checkout

   1.1. Create a new directory, initialize git, and add the remote

   ```bash
   mkdir klu-raycast
   cd klu-raycast
   git init
   git remote add -f origin https://github.com/klu-ai/klu-raycast
   ```

   1.2. Configure sparse checkout

   ```bash
   git config core.sparseCheckout true
   echo "extensions/klu-ai" >> .git/info/sparse-checkout
   ```

   1.3. Pull the repo

   ```bash
   git pull origin klu-ai
   git checkout klu-ai
   ```

2. Install dependencies

```bash
npm install
```

3. Run the app

```bash
npm run dev
```
