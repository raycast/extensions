// src/components/serverSelector.tsx
import React, { useState, useEffect, useCallback } from 'react';
import * as Raycast from '@raycast/api';
import {
  fetchServerLocations,
  selectRandomServerFromCity,
  CountryLocation,
} from '../utils/serverUtils';

// Extract simple components
const showToast = Raycast.showToast;
const Toast = Raycast.Toast;
const Icon = Raycast.Icon;

// Define proper types for List to avoid 'any' usage and interface extension issues
interface ListProps {
  isLoading?: boolean;
  navigationTitle?: string;
  children?: React.ReactNode;
  searchBarPlaceholder?: string;
  searchText?: string;
  onSearchTextChange?: (text: string) => void;
}

interface ListComponent {
  (props: ListProps): React.ReactElement | null;
  Item: React.ComponentType<Record<string, unknown>>;
  Section: React.ComponentType<Record<string, unknown>>;
  EmptyView: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for ActionPanel
interface ActionPanelProps {
  children?: React.ReactNode;
}

interface ActionPanelComponent {
  (props: ActionPanelProps): React.ReactElement | null;
  Section: React.ComponentType<Record<string, unknown>>;
}

// Define proper types for Action
interface ActionProps {
  title: string;
  icon?: unknown;
  onAction?: () => void;
  shortcut?: unknown;
}

interface ActionComponent {
  (props: ActionProps): React.ReactElement | null;
  OpenInBrowser: React.ComponentType<Record<string, unknown>>;
  Push: React.ComponentType<Record<string, unknown>>;
  Pop: React.ComponentType<Record<string, unknown>>;
  Copy: React.ComponentType<Record<string, unknown>>;
  Paste: React.ComponentType<Record<string, unknown>>;
  ShowInFinder: React.ComponentType<Record<string, unknown>>;
  Open: React.ComponentType<Record<string, unknown>>;
  OpenWith: React.ComponentType<Record<string, unknown>>;
  SubmitForm: React.ComponentType<Record<string, unknown>>;
  Trash: React.ComponentType<Record<string, unknown>>;
}

// Type assertions to bypass the complex intersection type issues
const List = (Raycast as unknown as { List: ListComponent }).List;
const ActionPanel = (
  Raycast as unknown as { ActionPanel: ActionPanelComponent }
).ActionPanel;
const Action = (Raycast as unknown as { Action: ActionComponent }).Action;

export interface ServerSelectorProps {
  onServerSelected: () => void | Promise<void>;
  onBack?: () => void;
}

const ServerSelector: React.FC<ServerSelectorProps> = ({
  onServerSelected,
  onBack,
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<CountryLocation[]>([]);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryLocation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState<string>('');

  // Clear search text when changing views
  useEffect(() => {
    setSearchText('');
  }, [selectedCountry]);

  // Function to handle country selection
  const handleCountrySelect = useCallback((country: CountryLocation) => {
    setSelectedCountry(country);
  }, []);

  // Function to handle city selection
  const handleCitySelect = useCallback(
    async (
      country: CountryLocation,
      city: { cityName: string; cityCode: string; servers: string[] }
    ) => {
      try {
        setIsLoading(true);

        // Show an immediate toast to indicate the process has started
        await showToast({
          style: Toast.Style.Animated,
          title: `Configuring server location: ${city.cityName}...`,
        });

        const success = await selectRandomServerFromCity(
          country.countryCode,
          city.cityCode
        );

        if (success) {
          // Use more accurate messaging
          await showToast(
            Toast.Style.Success,
            `Server location set to ${city.cityName}, ${country.country}`
          );

          // Wait a moment before returning to main view
          setTimeout(() => {
            onServerSelected();
          }, 500);
        } else {
          await showToast(
            Toast.Style.Failure,
            `Failed to set server location to ${city.cityName}`
          );
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to select server:', error);
        await showToast(
          Toast.Style.Failure,
          'Failed to configure server location'
        );
        setIsLoading(false);
      }
    },
    [onServerSelected]
  );

  useEffect(() => {
    const loadServers = async () => {
      try {
        const serverLocations = await fetchServerLocations();
        setLocations(serverLocations);
        setError(null);
      } catch (error) {
        console.error('Failed to load server locations:', error);
        setError('Failed to load server locations');
        showToast(Toast.Style.Failure, 'Failed to load server locations');
      } finally {
        setIsLoading(false);
      }
    };

    loadServers();
  }, []);

  // Filter countries based on search text
  const filteredCountries = locations.filter(
    (country) =>
      searchText === '' ||
      country.country.toLowerCase().includes(searchText.toLowerCase()) ||
      country.countryCode.toLowerCase().includes(searchText.toLowerCase())
  );

  // When in country view (no country selected)
  if (!selectedCountry) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Search countries..."
        navigationTitle="Select VPN Server Location"
        searchText={searchText}
        onSearchTextChange={setSearchText}
      >
        {error ? (
          <List.EmptyView
            title="Error Loading Servers"
            description={error}
            icon={Icon.Warning}
            actions={
              <ActionPanel>
                <Action
                  title="Try Again"
                  icon={Icon.RotateClockwise}
                  onAction={() => {
                    setIsLoading(true);
                    setError(null);
                    fetchServerLocations()
                      .then((data) => {
                        setLocations(data);
                        setIsLoading(false);
                      })
                      .catch((err) => {
                        console.error('Retry failed:', err);
                        setError('Failed to load server locations');
                        setIsLoading(false);
                        showToast(
                          Toast.Style.Failure,
                          'Failed to load server locations'
                        );
                      });
                  }}
                />
                {onBack && (
                  <Action
                    title="Back to Main Menu"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                    shortcut={{ modifiers: ['cmd'], key: 'b' }}
                  />
                )}
              </ActionPanel>
            }
          />
        ) : (
          filteredCountries.map((country) => (
            <List.Item
              key={country.countryCode}
              title={country.country}
              subtitle={`${country.cities.length} ${country.cities.length === 1 ? 'city' : 'cities'}`}
              icon={{
                source: `https://countryflagsapi.com/png/${country.countryCode}`,
                fallback: country.countryCode.toUpperCase(),
              }}
              actions={
                <ActionPanel>
                  <ActionPanel.Section>
                    <Action
                      title={`Select ${country.country}`}
                      icon={Icon.Globe}
                      onAction={() => handleCountrySelect(country)}
                      shortcut={{ modifiers: ['cmd'], key: 'return' }}
                    />
                  </ActionPanel.Section>
                  {onBack && (
                    <ActionPanel.Section>
                      <Action
                        title="Back to Main Menu"
                        icon={Icon.ArrowLeft}
                        onAction={onBack}
                        shortcut={{ modifiers: ['cmd'], key: 'b' }}
                      />
                    </ActionPanel.Section>
                  )}
                </ActionPanel>
              }
            />
          ))
        )}

        {filteredCountries.length === 0 && !error && !isLoading && (
          <List.EmptyView
            title="No Countries Found"
            description="Try a different search term."
            icon={Icon.Globe}
            actions={
              <ActionPanel>
                <Action
                  title="Clear Search"
                  icon={Icon.Trash}
                  onAction={() => setSearchText('')}
                />
                {onBack && (
                  <Action
                    title="Back to Main Menu"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                    shortcut={{ modifiers: ['cmd'], key: 'b' }}
                  />
                )}
              </ActionPanel>
            }
          />
        )}
      </List>
    );
  }

  // When a country is selected, show its cities
  // Filter cities based on search text
  const filteredCities = selectedCountry.cities.filter(
    (city) =>
      searchText === '' ||
      city.cityName.toLowerCase().includes(searchText.toLowerCase()) ||
      city.cityCode.toLowerCase().includes(searchText.toLowerCase())
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search cities..."
      navigationTitle={`Select City in ${selectedCountry.country}`}
      searchText={searchText}
      onSearchTextChange={setSearchText}
    >
      <List.Section title={selectedCountry.country}>
        {filteredCities.map((city) => (
          <List.Item
            key={city.cityCode}
            title={city.cityName}
            subtitle={`${city.servers.length} ${city.servers.length === 1 ? 'server' : 'servers'}`}
            icon={Icon.Pin}
            actions={
              <ActionPanel>
                <ActionPanel.Section>
                  <Action
                    title={`Set Server to ${city.cityName}`}
                    icon={Icon.Globe}
                    shortcut={{ modifiers: ['cmd'], key: 'return' }}
                    onAction={() => handleCitySelect(selectedCountry, city)}
                  />
                  <Action
                    title="Back to Countries"
                    icon={Icon.ArrowLeft}
                    shortcut={{ modifiers: ['cmd'], key: 'b' }}
                    onAction={() => setSelectedCountry(null)}
                  />
                </ActionPanel.Section>
                {onBack && (
                  <ActionPanel.Section>
                    <Action
                      title="Back to Main Menu"
                      icon={Icon.ArrowLeft}
                      onAction={onBack}
                      shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                    />
                  </ActionPanel.Section>
                )}
              </ActionPanel>
            }
          />
        ))}
      </List.Section>

      {filteredCities.length === 0 && !isLoading && (
        <List.EmptyView
          title="No Cities Found"
          description="Try a different search term."
          icon={Icon.Pin}
          actions={
            <ActionPanel>
              <ActionPanel.Section>
                <Action
                  title="Clear Search"
                  icon={Icon.Trash}
                  onAction={() => setSearchText('')}
                />
                <Action
                  title="Back to Countries"
                  icon={Icon.ArrowLeft}
                  onAction={() => setSelectedCountry(null)}
                  shortcut={{ modifiers: ['cmd'], key: 'b' }}
                />
              </ActionPanel.Section>
              {onBack && (
                <ActionPanel.Section>
                  <Action
                    title="Back to Main Menu"
                    icon={Icon.ArrowLeft}
                    onAction={onBack}
                    shortcut={{ modifiers: ['cmd'], key: 'backspace' }}
                  />
                </ActionPanel.Section>
              )}
            </ActionPanel>
          }
        />
      )}
    </List>
  );
};

export default ServerSelector;
