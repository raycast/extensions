const DEFAULT_IGNORE_RULES = `
# Directories to ignore
node_modules/
.git/
dist/
build/
coverage/
tmp/
logs/
.cache/
.vscode/
.idea/
__pycache__/
bower_components/
jspm_packages/
*.xcodeproj/
*.xcworkspace/

# Files to ignore
.DS_Store
*.log
.env
.env.local
*.pyc
package-lock.json
yarn.lock
pnpm-lock.yaml
.npmrc
.yarnrc
# *
.#*

# Binary and media files
*.jpg
*.jpeg
*.png
*.gif
*.bmp
*.tiff
*.webp
*.ico
*.svg
*.mp3
*.wav
*.flac
*.mp4
*.avi
*.mkv
*.mov
*.wmv
*.exe
*.dll
*.bin
*.iso
*.dmg
*.pkg
*.zip
*.rar
*.tar
*.gz
*.7z
*.bz2
*.pdf
*.doc
*.docx
*.xls
*.xlsx
*.ppt
*.pptx
*.tiktoken
*.db
*.sqlite
*.ttf
*.xsd
`.trim();

export default DEFAULT_IGNORE_RULES;
