# Spatie Documentation

![Raycast Spatie Open Source Packages Documentation](./assets/raycast-spatie-documentation-extension.png)

Easy access commands for Spatie open source packages documentations

---

## Adding new spatie package (command)

1. create folder containing links of the documentation pages something similar to `src/documentation/laravel-backup.json`
2. create `.tsx` file for the newly added package (command) as in `src/laravel-permission.tsx` which will be used to fetch data from file created in step 1
3. add the command and the package supported versions to package.json
4. run `npm run build` to validate your work
5. don't forget to add your raycast username to `contributors` in `package.json`
