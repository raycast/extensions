import { SOURCE_REPOSITORY } from "./constants";
import { getPreferences } from "./preferences";
import { DocEntry, isType } from "./types";

function topLevelType(entry: DocEntry): { pkg: string; simple: string } | null {
  const type = entry.owner || (isType(entry.kind) ? entry.name : "");
  if (!type) return null;

  const pkg = entry.pkg;
  const nested = type.slice(pkg.length + 1);
  return { pkg, simple: nested.split(".")[0] };
}

export function markdownLink(entry: DocEntry): string {
  const label = entry.kind === "guide" ? entry.display : entry.name;
  return `[${label}](${entry.url})`;
}

export function importStatement(entry: DocEntry): string | null {
  const target = topLevelType(entry);
  return target ? `import ${target.pkg}.${target.simple};` : null;
}

export function sourceUrl(entry: DocEntry): string | null {
  const target = topLevelType(entry);
  if (!target) return null;

  const file = `${target.pkg.replace(/\./g, "/")}/${target.simple}.java`;
  return `https://github.com/${SOURCE_REPOSITORY}/blob/master/src/main/java/${file}`;
}

// ListenerAdapter names its handler after the event minus the Event suffix,
// except for the three roots that would otherwise collide with a shorter name.
const LISTENER_METHODS = new Map<string, string>([
  ["GenericEvent", "onGenericEvent"],
  ["UpdateEvent", "onGenericUpdate"],
  ["RawGatewayEvent", "onRawGateway"],
]);

function listenerMethod(entry: DocEntry): string | null {
  const named = LISTENER_METHODS.get(entry.display);
  if (named) return named;

  const simple = entry.display.replace(/Event$/, "");
  return simple ? `on${simple}` : null;
}

function eventBoilerplate(entry: DocEntry): string | null {
  const method = listenerMethod(entry);
  if (!method) return null;

  return [
    "public class MyListener extends ListenerAdapter",
    "{",
    "    @Override",
    `    public void ${method}(${entry.display} event)`,
    "    {",
    "        ",
    "    }",
    "}",
  ].join("\n");
}

function templates(): Map<string, string> {
  const variable = getPreferences().jdaVariable;

  return new Map<string, string>([
    [
      "net.dv8tion.jda.api.JDABuilder",
      [
        "JDA jda = JDABuilder.createDefault(token)",
        "        .enableIntents(GatewayIntent.MESSAGE_CONTENT)",
        "        .addEventListeners(new MyListener())",
        "        .build();",
        "",
        "jda.awaitReady();",
      ].join("\n"),
    ],
    [
      "net.dv8tion.jda.api.sharding.DefaultShardManagerBuilder",
      [
        "ShardManager shardManager = DefaultShardManagerBuilder.createDefault(token)",
        "        .enableIntents(GatewayIntent.MESSAGE_CONTENT)",
        "        .addEventListeners(new MyListener())",
        "        .build();",
      ].join("\n"),
    ],
    [
      "net.dv8tion.jda.api.EmbedBuilder",
      [
        "MessageEmbed embed = new EmbedBuilder()",
        '        .setTitle("Title")',
        '        .setDescription("Description")',
        "        .setColor(0x5865F2)",
        "        .build();",
      ].join("\n"),
    ],
    [
      "net.dv8tion.jda.api.interactions.commands.build.Commands",
      [
        `${variable}.upsertCommand(Commands.slash("ping", "Check the bot latency"))`,
        "        .queue();",
      ].join("\n"),
    ],
    [
      "net.dv8tion.jda.api.components.buttons.Button",
      [
        'event.reply("Pick one")',
        '        .addComponents(ActionRow.of(Button.primary("confirm", "Confirm"), Button.danger("cancel", "Cancel")))',
        "        .queue();",
      ].join("\n"),
    ],
    [
      "net.dv8tion.jda.api.requests.RestAction",
      [
        'channel.sendMessage("Hello!").queue(',
        '        success -> System.out.println("Sent " + success.getId()),',
        "        error -> error.printStackTrace());",
      ].join("\n"),
    ],
  ]);
}

export function boilerplate(entry: DocEntry): string | null {
  if (entry.kind === "event") return eventBoilerplate(entry);
  return templates().get(entry.name) ?? null;
}
