# Final Test Checklist

Before submitting to the Raycast Store, test all functionality:

## ✅ Basic Functionality Tests

### Test 1: Auto-Detection
- [ ] Select an image in Finder
- [ ] Open Raycast → "Remove Background"
- [ ] Verify: File is automatically detected
- [ ] Verify: Processing starts automatically (if preferences are set)

### Test 2: Manual File Selection
- [ ] Open extension without file selected
- [ ] Click "Select File from Finder" (⌘F)
- [ ] Verify: File is selected and shown
- [ ] Click "Remove Background" (⌘Enter)
- [ ] Verify: Processing starts

### Test 3: Manual File Path Entry
- [ ] Open extension
- [ ] Type file path manually in text field
- [ ] Click "Remove Background"
- [ ] Verify: Processing starts

### Test 4: Successful Processing
- [ ] Process a small image (<10MB)
- [ ] Verify: All status messages appear
- [ ] Verify: Image is saved to Downloads
- [ ] Verify: Preview opens automatically
- [ ] Verify: Completion screen shows
- [ ] Verify: Auto-closes after 3 seconds OR click "Done"
- [ ] Verify: Extension resets for next use

## ✅ File Format Tests

- [ ] Test with PNG image
- [ ] Test with JPG image
- [ ] Test with JPEG image
- [ ] Test with GIF image
- [ ] Test with WEBP image

## ✅ File Size Tests

- [ ] Test with small image (<1MB)
- [ ] Test with medium image (5-10MB)
- [ ] Test with large image (>10MB) - should auto-compress
- [ ] Test with very large image (>100MB) - should show error

## ✅ Error Handling Tests

### Test 5: Missing Preferences
- [ ] Clear cloud name preference
- [ ] Open extension
- [ ] Verify: Warning message appears
- [ ] Verify: Cannot submit without preferences

### Test 6: Invalid File
- [ ] Try to process a non-image file (e.g., .txt)
- [ ] Verify: Error message appears
- [ ] Verify: Clear error message

### Test 7: Network Error
- [ ] Disconnect internet
- [ ] Try to process image
- [ ] Verify: Error message about network
- [ ] Reconnect and verify it works

### Test 8: Invalid Cloud Name
- [ ] Set invalid cloud name
- [ ] Try to process image
- [ ] Verify: Error message about cloud name

### Test 9: No File Selected
- [ ] Open extension without file
- [ ] Try to submit
- [ ] Verify: Error message appears

## ✅ UI/UX Tests

### Test 10: Keyboard Shortcuts
- [ ] Test ⌘Enter (Remove Background)
- [ ] Test ⌘F (Select File from Finder)
- [ ] Verify: All shortcuts work

### Test 11: Action Panel
- [ ] Verify: All actions have icons
- [ ] Verify: All actions use Title Case
- [ ] Verify: Actions are enabled/disabled correctly

### Test 12: Completion Screen
- [ ] Process an image
- [ ] Verify: Completion screen shows file path
- [ ] Verify: "Done" button works
- [ ] Verify: "Show in Finder" works
- [ ] Verify: "Open in Preview" works
- [ ] Verify: "Copy Path" works
- [ ] Verify: Auto-closes after 3 seconds

### Test 13: Status Messages
- [ ] Process an image
- [ ] Verify: Status messages update:
  - "Validating image..."
  - "Compressing..." (if large)
  - "Uploading to Cloudinary..."
  - "Trying AI Background Removal..."
  - "Saving image..."
  - "Background removed successfully!"

## ✅ Preferences Tests

### Test 14: Required Preference
- [ ] Clear cloud name
- [ ] Open extension
- [ ] Verify: Required preference prompt appears

### Test 15: Preference Validation
- [ ] Set cloud name
- [ ] Verify: Extension becomes usable
- [ ] Change output directory
- [ ] Verify: New directory is used

## ✅ Edge Cases

### Test 16: Special Characters in Path
- [ ] Test with file path containing spaces
- [ ] Test with file path containing special characters
- [ ] Verify: Handles correctly

### Test 17: Output File Already Exists
- [ ] Process same image twice
- [ ] Verify: Second file gets unique name (_no_background_1.png)

### Test 18: Output Directory Doesn't Exist
- [ ] Set output directory to non-existent path
- [ ] Process image
- [ ] Verify: Directory is created automatically

### Test 19: Multiple Files Selected in Finder
- [ ] Select multiple files in Finder
- [ ] Open extension
- [ ] Verify: Handles gracefully (should get first file or show error)

## ✅ Theme Tests

- [ ] Test in Light theme
- [ ] Test in Dark theme
- [ ] Verify: Icon visible in both
- [ ] Verify: UI looks good in both

## ✅ Performance Tests

- [ ] Test with very small image (<100KB)
- [ ] Test with large image (10MB+)
- [ ] Verify: Processing time is reasonable
- [ ] Verify: No memory leaks (process multiple images)

## 📝 Test Results

Document any issues found:

1. 
2. 
3. 

---

**Ready for Store**: [ ] Yes [ ] No


