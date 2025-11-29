HTTP_CAT_IMAGES_URL=https://http.cat/images
HTTP_CAT_GITHUB_STATUSES=https://raw.githubusercontent.com/httpcats/http.cat/refs/heads/master/lib/statuses.js
OUTPUT_DIR=assets
STATUS_FILE=src/statuses.js

.PHONY: update-statuses download-images update

# Fetch the latest status codes from github and copy the file into the repo
update-statuses:
	curl -s $(HTTP_CAT_GITHUB_STATUSES) -o $(STATUS_FILE)

# Using the statuses file, find all status codes and download each corresponding image
download-images:
	mkdir -p $(OUTPUT_DIR)
	grep -oE 'code: [0-9]+' "$(STATUS_FILE)" | awk '{print $$2}' | sort -u | \
	while read -r code; do \
		url="$(HTTP_CAT_IMAGES_URL)/$$code.jpg"; \
		echo "Downloading $$url..."; \
		curl -s -f -o "$(OUTPUT_DIR)/$$code.jpg" "$$url" || echo "Failed to download $$code.jpg"; \
	done

# Update both the statuses and images
update: update-statuses download-images
