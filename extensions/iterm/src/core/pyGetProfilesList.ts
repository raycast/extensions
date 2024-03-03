import {} from "../utils";

export const pyGetProfilesList = () => {
  return /* python */ `
import iterm2
import json

async def main(connection):
    app = await iterm2.async_get_app(connection)
    list = []

    # Query for the list of profiles so we can search by name. This returns a
    # subset of the full profiles so it's fast.
    partialProfiles = await iterm2.PartialProfile.async_query(connection)

    # Iterate over each partial profile
    for partial in partialProfiles:
        list.append(partial.name)

    print(json.dumps(list))

iterm2.run_until_complete(main)
` /* end python */;
};
