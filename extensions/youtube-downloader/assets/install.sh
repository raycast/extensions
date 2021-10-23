#osascript -e 'do shell script " curl -L https://yt-dl.org/downloads/latest/youtube-dl -o /usr/local/bin/youtube-dl;chmod a+rx /usr/local/bin/youtube-dl " with administrator privileges'
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)";
brew install youtube-dl
brew install ffmpeg