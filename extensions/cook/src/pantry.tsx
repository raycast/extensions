/**
 * PANTRY — Browse your inventory with filters, status indicators, and shopping list actions.
 *
 * Item status is determined by parsing the quantity and extra info:
 *   "unlim"           → ♾ unlimited
 *   "0"               → ❌ depleted (show "Add to Shopping List")
 *   "some"            → ⚠ low
 *   "expires: DATE"   → ⏰ expiring (within 7 days) or ⌛ expired (past date)
 *   everything else   → ✅ in stock
 *
 * Filter bar: All | In Stock | Low/Out | Expiring | Unlimited
 */

import { List, ActionPanel, Action, Icon, Color } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import { runCook } from "./utils";

// ── TYPES ──

type FilterMode = "all" | "in-stock" | "low-out" | "expiring" | "unlimited";

interface PantryItem {
  name: string;
  quantity: string;
  extra?: string;
  isDepleted: boolean; // qty === "0"
  isLow: boolean; // qty === "some"
  isUnlimited: boolean; // qty === "unlim"
  isExpiring: boolean; // has expires: with date within 7 days
  isExpired: boolean; // has expires: with date in the past
}

interface PantryCategory {
  name: string;
  items: PantryItem[];
}

// ── PARSER ──

function parsePantryText(raw: string): PantryCategory[] {
  const categories: PantryCategory[] = [];
  let current: PantryCategory | null = null;
  const now = new Date();

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || /^=+$/.test(t)) continue;

    // Category header: ALL CAPS followed by colon (FRIDGE:, GARDEN:, etc.)
    if (/^[A-Z][A-Z ]{1,30}:$/.test(t)) {
      current = { name: t.replace(/:$/, ""), items: [] };
      categories.push(current);
      continue;
    }

    // Item line: "  • name - 250%g (expires: 2026-04-15)"
    if (t.startsWith("•") && current) {
      const content = t.replace(/^•\s*/, "");
      let name: string, qtyPart: string, extra: string | undefined;

      const dashIdx = content.indexOf(" - ");
      if (dashIdx !== -1) {
        name = content.slice(0, dashIdx).trim();
        const rest = content.slice(dashIdx + 3).trim();

        const parenIdx = rest.indexOf(" (");
        if (parenIdx !== -1) {
          qtyPart = rest.slice(0, parenIdx).trim();
          extra = rest.slice(parenIdx + 2, -1).trim();
        } else {
          qtyPart = rest;
        }

        // Clean % unit separator
        qtyPart = qtyPart.replace(/%([a-zA-Z]+)/g, " $1");
      } else {
        name = content;
        qtyPart = "";
      }

      // Determine status
      const isDepleted = qtyPart === "0";
      const isLow = qtyPart === "some";
      const isUnlimited = qtyPart === "unlim";
      let isExpired = false;
      let isExpiring = false;

      if (extra) {
        const expMatch = extra.match(/expires:\s*(\d{4}-\d{2}-\d{2})/);
        if (expMatch) {
          const d = new Date(expMatch[1]);
          const daysLeft = Math.ceil((d.getTime() - now.getTime()) / 86400000);
          isExpired = daysLeft < 0;
          isExpiring = daysLeft >= 0 && daysLeft <= 7;
        }
      }

      current.items.push({
        name,
        quantity: qtyPart,
        extra,
        isDepleted,
        isLow,
        isUnlimited,
        isExpiring,
        isExpired,
      });
    }
  }
  return categories;
}

// ── COMMAND ──

export default function Command() {
  const [categories, setCategories] = useState<PantryCategory[]>([]);
  const [recipesSections, setRecipesSections] = useState<
    { title: string; items: string[] }[]
  >([]);
  const [showRecipes, setShowRecipes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterMode>("all");

  useEffect(() => {
    let cancelled = false;

    async function loadPantry() {
      setLoading(true);
      try {
        const raw = await runCook(["pantry", "list"]);
        if (!cancelled) setCategories(parsePantryText(raw));
      } catch {
        if (!cancelled) setCategories([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadPantry();
    return () => {
      cancelled = true;
    };
  }, []);

  async function loadRecipes() {
    setLoading(true);
    try {
      const raw = await runCook(["pantry", "recipes"]);
      const sections = parsePantryRecipes(raw);
      setRecipesSections(sections);
      setShowRecipes(true);
    } catch (err) {
      setRecipesSections([
        {
          title: "Error",
          items: [err instanceof Error ? err.message : String(err)],
        },
      ]);
      setShowRecipes(true);
    } finally {
      setLoading(false);
    }
  }

  // Filter items within each category based on selected filter
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter((item) => {
          switch (filter) {
            case "in-stock":
              return !item.isDepleted && !item.isLow && !item.isExpired;
            case "low-out":
              return item.isDepleted || item.isLow;
            case "expiring":
              return item.isExpiring || item.isExpired;
            case "unlimited":
              return item.isUnlimited;
            default:
              return true;
          }
        }),
      }))
      .filter((cat) => cat.items.length > 0); // hide empty categories
  }, [categories, filter]);

  // Count depleted items for the badge
  const depletedCount = useMemo(
    () =>
      categories.reduce(
        (sum, cat) =>
          sum + cat.items.filter((i) => i.isDepleted || i.isLow).length,
        0,
      ),
    [categories],
  );
  const expiringCount = useMemo(
    () =>
      categories.reduce(
        (sum, cat) =>
          sum + cat.items.filter((i) => i.isExpiring || i.isExpired).length,
        0,
      ),
    [categories],
  );

  // "What Can I Make?" view
  if (showRecipes) {
    return (
      <List
        isLoading={loading}
        navigationTitle="What Can I Make?"
        actions={
          <ActionPanel>
            <Action
              title="Back to Pantry"
              icon={Icon.ArrowLeft}
              onAction={() => setShowRecipes(false)}
            />
          </ActionPanel>
        }
      >
        {recipesSections.map((sec, i) => (
          <List.Section key={i} title={sec.title}>
            {sec.items.map((item, j) => (
              <List.Item
                key={j}
                title={item}
                icon={sec.title.includes("✓") ? Icon.CheckCircle : Icon.Circle}
              />
            ))}
          </List.Section>
        ))}
      </List>
    );
  }

  // Build filter accessory
  const filterOptions: { title: string; value: FilterMode }[] = [
    { title: "All Items", value: "all" },
    { title: "In Stock", value: "in-stock" },
    { title: `Low / Out (${depletedCount})`, value: "low-out" },
    { title: `Expiring (${expiringCount})`, value: "expiring" },
    { title: "Unlimited", value: "unlimited" },
  ];

  return (
    <List
      isLoading={loading}
      navigationTitle="Pantry"
      searchBarPlaceholder="Search pantry…"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter pantry"
          value={filter}
          onChange={(v) => setFilter(v as FilterMode)}
        >
          {filterOptions.map((opt) => (
            <List.Dropdown.Item
              key={opt.value}
              title={opt.title}
              value={opt.value}
            />
          ))}
        </List.Dropdown>
      }
      actions={
        <ActionPanel>
          <Action
            title="What Can I Make?"
            icon={Icon.LightBulb}
            onAction={loadRecipes}
          />
          <Action
            title="Show All Items"
            icon={Icon.List}
            onAction={() => setFilter("all")}
          />
          <Action
            title={`Show Low / out (${depletedCount})`}
            icon={Icon.XmarkCircle}
            onAction={() => setFilter("low-out")}
          />
          <Action
            title={`Show Expiring (${expiringCount})`}
            icon={Icon.Clock}
            onAction={() => setFilter("expiring")}
          />
        </ActionPanel>
      }
    >
      {filteredCategories.map((cat) => (
        <List.Section
          key={cat.name}
          title={cat.name}
          subtitle={`${cat.items.length} items`}
        >
          {cat.items.map((item, i) => {
            // Status dot color
            const dotColor = item.isDepleted
              ? Color.Red
              : item.isLow
                ? Color.Orange
                : item.isExpired
                  ? Color.Red
                  : item.isExpiring
                    ? Color.Yellow
                    : item.isUnlimited
                      ? Color.Blue
                      : Color.Green;

            return (
              <List.Item
                key={`${cat.name}-${i}`}
                title={item.name}
                subtitle={item.extra}
                accessories={[
                  item.quantity ? { text: item.quantity } : {},
                  { icon: { source: Icon.Circle, tintColor: dotColor } },
                ].filter((a) => a.text || a.icon)}
                actions={
                  <ActionPanel>
                    {(item.isDepleted || item.isLow) && (
                      <Action.CopyToClipboard
                        title="Add to Shopping List"
                        content={item.name}
                        icon={Icon.Cart}
                      />
                    )}
                    <Action
                      title="What Can I Make?"
                      icon={Icon.LightBulb}
                      onAction={loadRecipes}
                    />
                    <Action
                      title={`Show Low / out (${depletedCount})`}
                      icon={Icon.XmarkCircle}
                      onAction={() => setFilter("low-out")}
                    />
                    <Action
                      title={`Show Expiring (${expiringCount})`}
                      icon={Icon.Clock}
                      onAction={() => setFilter("expiring")}
                    />
                    <Action
                      title="Show All Items"
                      icon={Icon.List}
                      onAction={() => setFilter("all")}
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}

// ── PANTRY RECIPES PARSER ──
//
// CookCLI pantry recipes output:
//   Recipes You Can Make with Pantry Items:
//   ========================================
//   ✓ Complete Matches (all ingredients available):
//     • Easy Pancakes
//   Partial Matches:
//     • Something Else

function parsePantryRecipes(raw: string): { title: string; items: string[] }[] {
  const sections: { title: string; items: string[] }[] = [];
  let currentTitle = "Results";
  let currentItems: string[] = [];

  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || /^=/.test(t) || /^Recipes You Can Make/i.test(t)) continue;

    // Category header: "✓ Complete Matches" or "Partial Matches"
    if (t.startsWith("✓") || (/^[A-Z]/.test(t) && t.includes(":"))) {
      if (currentItems.length > 0) {
        sections.push({ title: currentTitle, items: [...currentItems] });
      }
      currentTitle = t.replace(/:$/, "");
      currentItems = [];
      continue;
    }

    // Item: "  • Easy Pancakes"
    const match = t.match(/^•\s*(.+)/);
    if (match) {
      currentItems.push(match[1].trim());
    }
  }

  if (currentItems.length > 0) {
    sections.push({ title: currentTitle, items: currentItems });
  }

  return sections.length > 0
    ? sections
    : [{ title: "Results", items: ["No recipes found"] }];
}
