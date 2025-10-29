# Publishing to Raycast Store

This guide will help you publish your Magic 8-Ball extension to the Raycast Store.

## Prerequisites

1. **Raycast Account**: Create an account at [raycast.com](https://raycast.com)
2. **GitHub Account**: Required for the submission process
3. **Test Your Extension**: Make sure it works perfectly locally

## Preparation Steps

### 1. Test Locally
```bash
npm run dev
```
Open Raycast and test the "Ask 8 Ball" command thoroughly.

### 2. Verify Build
```bash
npm run build
```
Ensure there are no build errors.

### 3. Check Metadata
Verify in `package.json`:
- ✅ Title is clear and concise
- ✅ Description is helpful
- ✅ Author name is correct
- ✅ Icon exists in assets folder
- ✅ Categories are appropriate
- ✅ All required fields are filled

### 4. Documentation
- ✅ README.md is complete and helpful
- ✅ CHANGELOG.md documents features
- ✅ Screenshots (optional but recommended)

## Publishing Process

### Method 1: Using NPM Script (Recommended)
```bash
npm run publish
```

This will:
1. Build your extension
2. Validate all requirements
3. Guide you through the submission process
4. Create a PR to the Raycast extensions repository

### Method 2: Manual Submission

1. **Fork the Repository**
   - Go to [raycast/extensions](https://github.com/raycast/extensions)
   - Click "Fork"

2. **Add Your Extension**
   ```bash
   # Clone your fork
   git clone https://github.com/YOUR_USERNAME/extensions.git
   cd extensions
   
   # Copy your extension
   cp -r /path/to/magic-8-ball extensions/magic-8-ball
   
   # Create a branch
   git checkout -b add-magic-8-ball
   
   # Commit and push
   git add extensions/magic-8-ball
   git commit -m "Add Magic 8-Ball extension"
   git push origin add-magic-8-ball
   ```

3. **Create Pull Request**
   - Go to your fork on GitHub
   - Click "Pull Request"
   - Fill in the template
   - Submit!

## Review Process

1. **Automated Checks**: CI will run tests
2. **Team Review**: Raycast team reviews your extension
3. **Feedback**: Address any requested changes
4. **Approval**: Once approved, it's merged!
5. **Published**: Your extension appears in the Raycast Store

## Store Guidelines Checklist

- [ ] Extension works without errors
- [ ] No hardcoded personal data
- [ ] Icon is high quality (512x512px recommended)
- [ ] Title follows naming conventions
- [ ] Description is clear and helpful
- [ ] README has usage instructions
- [ ] CHANGELOG documents features
- [ ] Code follows TypeScript best practices
- [ ] No API keys or secrets in code
- [ ] Extension is in appropriate category

## Tips for Success

1. **Clear Description**: Make it obvious what your extension does
2. **Good Documentation**: Help users understand how to use it
3. **Quality Icon**: A professional icon makes a great first impression
4. **Test Thoroughly**: Try it in different scenarios
5. **Follow Guidelines**: Read [Raycast's extension guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)

## After Publication

Once published, users can:
- Find your extension by searching "Magic 8 Ball" in Raycast
- Install it with one click
- Rate and review it
- Suggest improvements

## Maintenance

- Monitor issues and feedback
- Update when Raycast API changes
- Add new features based on user requests
- Keep dependencies up to date

## Resources

- [Raycast Developer Docs](https://developers.raycast.com/)
- [Extension Guidelines](https://developers.raycast.com/basics/prepare-an-extension-for-store)
- [API Reference](https://developers.raycast.com/api-reference/command)
- [Extensions Repository](https://github.com/raycast/extensions)

## Questions?

- Join the [Raycast Slack community](https://raycast.com/community)
- Check the [developer forum](https://raycast.com/community)
- Review other published extensions for examples

Good luck with your submission! 🎱✨
