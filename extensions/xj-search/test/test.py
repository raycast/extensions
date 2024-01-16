# %%
import re
import json


def get_config_file_content():
    with open("chrome-taskfile.yaml", "r") as f:
        return f.read()


def extact_to_urls_data():
    # Your configuration file content here
    config_file_content = get_config_file_content()

    # Define a pattern to extract URL, title, description, and icon (if available)
    pattern = r'vars:\s+(?P<var_name>[\w\d_]+):\s+"(?P<url>https?://[^"]+)"\s*(desc:\s+"(?P<description>[^"]+)")?.*'

    # Find all matches in the configuration file
    matches = re.finditer(pattern, config_file_content, re.MULTILINE | re.DOTALL)

    # Initialize an empty list to store JSON objects
    json_array = []

    # Loop through the matches and build JSON objects
    for match in matches:
        url = match.group("url")
        title = match.group("var_name")
        description = match.group("description")
        icon = None  # You can add logic to extract the icon if it's available

        # Build the JSON object
        json_obj = {
            "url": url,
            "title": title,
            "description": description,
            "icon": icon,
            "version": "3",
        }

        json_array.append(json_obj)

    # Convert the list of JSON objects to a JSON array
    result_json = json.dumps(json_array, indent=4)

    # Print the JSON array, save into "test.json"
    print(result_json)
    with open("test.json", "w") as f:
        f.write(result_json)


# %%

# extact_to_urls_data()


# %%
# convert the content raycast_search.js to raycast_search.json
import re
import json


# convert_js_to_json()
