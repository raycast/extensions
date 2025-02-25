#!/bin/bash

# create-app.sh - Script to create the Nest Camera Viewer app using Platypus

# Check if Platypus is installed
if ! command -v platypus &> /dev/null; then
    echo "Error: Platypus is not installed."
    echo "Please install Platypus from https://sveinbjorn.org/platypus or via Homebrew:"
    echo "brew install --cask platypus"
    exit 1
fi

# Set paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_ROOT/assets"
SCRIPTS_DIR="$ASSETS_DIR/scripts"
APP_DIR="$ASSETS_DIR/app"
ICON_PATH="$ASSETS_DIR/command-icon.png"
SCRIPT_PATH="$SCRIPTS_DIR/nest-player.sh"
APP_PATH="$APP_DIR/Nest Camera Viewer.app"

# Create app directory if it doesn't exist
mkdir -p "$APP_DIR"

# Make sure the script is executable
chmod +x "$SCRIPT_PATH"

echo "Creating Nest Camera Viewer app..."
echo "Using script: $SCRIPT_PATH"
echo "Using icon: $ICON_PATH"
echo "Output path: $APP_PATH"

# Create a temporary bundled files list
BUNDLED_FILES_LIST=$(mktemp)
echo "$ICON_PATH:Resources/icon.png" > "$BUNDLED_FILES_LIST"

# Create the app using Platypus CLI with correct options
platypus \
    -a "Nest Camera Viewer" \
    -V "1.0" \
    -u "Nest Camera Extension" \
    -I "com.nestcamera.viewer" \
    -o "None" \
    -p "/bin/bash" \
    -i "$ICON_PATH" \
    -B \
    -y \
    -l \
    -U "nestcamera" \
    -f "$BUNDLED_FILES_LIST" \
    "$SCRIPT_PATH" "$APP_PATH"

# Check if app was created successfully
if [ -d "$APP_PATH" ]; then
    echo "App created successfully at: $APP_PATH"
    
    # Modify Info.plist to prevent dock icon issues
    INFO_PLIST="$APP_PATH/Contents/Info.plist"
    if [ -f "$INFO_PLIST" ]; then
        echo "Updating Info.plist to prevent dock icon issues..."
        
        # Use PlistBuddy to set LSUIElement to false (we want the main app to show in dock)
        /usr/libexec/PlistBuddy -c "Delete :LSUIElement" "$INFO_PLIST" 2>/dev/null
        /usr/libexec/PlistBuddy -c "Add :LSUIElement bool false" "$INFO_PLIST"
        
        # Add NSHighResolutionCapable for better display
        /usr/libexec/PlistBuddy -c "Delete :NSHighResolutionCapable" "$INFO_PLIST" 2>/dev/null
        /usr/libexec/PlistBuddy -c "Add :NSHighResolutionCapable bool true" "$INFO_PLIST"
        
        echo "Info.plist updated successfully."
    else
        echo "Warning: Could not find Info.plist at $INFO_PLIST"
    fi
    
    # Create a simplified launcher script that will be used by the app
    LAUNCHER_SCRIPT="$APP_PATH/Contents/Resources/launcher.sh"
    cat > "$LAUNCHER_SCRIPT" << EOF
#!/bin/bash

# This script ensures FFplay doesn't show in the dock
# It's called by the Platypus app

# Set environment variables to help hide FFplay
export DISPLAY_IN_DOCK=0
export LSUIElement=1
export LSBackgroundOnly=1

# Get the path to the original script
SCRIPT_PATH="\$0"
if [ "\$SCRIPT_PATH" == "launcher.sh" ]; then
    SCRIPT_PATH="\$(dirname "\$0")/script"
fi

# Execute the original script with all arguments
exec "\$SCRIPT_PATH" "\$@"
EOF
    
    # Make the launcher script executable
    chmod +x "$LAUNCHER_SCRIPT"
    
    # Modify the app's executable to use our launcher script
    EXECUTABLE_PATH="$APP_PATH/Contents/MacOS/Nest Camera Viewer"
    if [ -f "$EXECUTABLE_PATH" ]; then
        # Backup the original executable
        cp "$EXECUTABLE_PATH" "$EXECUTABLE_PATH.bak"
        
        # Modify the executable to use our launcher script
        sed -i '' "s|/Resources/script|/Resources/launcher.sh|g" "$EXECUTABLE_PATH" 2>/dev/null || \
        perl -pi -e 's|/Resources/script|/Resources/launcher.sh|g' "$EXECUTABLE_PATH"
        
        echo "Modified app executable to use launcher script."
    else
        echo "Warning: Could not find executable at $EXECUTABLE_PATH"
    fi
    
    echo "Done! You can now use the app in your Raycast extension."
    
    # Clean up
    rm -f "$BUNDLED_FILES_LIST"
else
    echo "Error: Failed to create app."
    rm -f "$BUNDLED_FILES_LIST"
    exit 1
fi 