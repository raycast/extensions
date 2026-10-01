import { argumentDefault, fetchCommands, fetchVersions, searchCommands } from "../lib/commands";

type Input = {
  /**
   * A command name like "make:model", or one or two keywords like "model" or "queue". The search is fuzzy, so full sentences match poorly. Leave empty to list every command by name and description only.
   */
  query?: string;
  /**
   * Laravel version, like "12.x" or "12". Defaults to the newest version.
   */
  version?: string;
};

/**
 * Search Laravel Artisan commands for one Laravel version, with each command's exact usage, options, and arguments.
 * Use this when the user asks which Artisan command does something, or about a command's options or arguments.
 */
export default async function searchArtisanCommandsTool(input: Input) {
  const versions = await fetchVersions();
  const wanted = input.version?.match(/\d+/)?.[0];
  const version = versions.find((available) => available === `${wanted}.x`) ?? versions[0];
  const versionWarnings =
    wanted && version !== `${wanted}.x`
      ? [`Laravel ${input.version} isn't available, so this is ${version}. Available: ${versions.join(", ")}.`]
      : [];
  const all = await fetchCommands(version);
  if (!input.query?.trim()) {
    return {
      version,
      commands: all.map(({ name, description }) => ({ name, description })),
      warnings: versionWarnings,
    };
  }
  const matches = searchCommands(all, input.query);
  const commands = matches.slice(0, 10);
  return {
    version,
    commands: commands.map((command) => ({
      name: command.name,
      description: command.description,
      usage: `php artisan ${command.synopsis}`,
      options: command.options.map((option) => ({
        name: `--${option.name}`,
        description: option.description,
        takesValue: option.value_required || option.value_optional,
      })),
      arguments: command.arguments.map((argument) => ({
        name: argument.name,
        description: argument.description,
        required: argument.required,
        default: argumentDefault(argument.default),
      })),
    })),
    warnings: [
      ...versionWarnings,
      ...(matches.length > commands.length
        ? [`Showing the top ${commands.length} of ${matches.length} matches. Search a narrower keyword for the rest.`]
        : []),
      ...(commands.length ? [] : [`No Artisan command matched "${input.query}".`]),
    ],
  };
}
