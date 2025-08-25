/**
 * React context provider for services
 * Provides dependency injection through React context
 */

import React, { createContext, useContext, ReactNode } from "react";
import { IServiceContainer, ServiceContainer } from "../services/ServiceContainer";

/**
 * Service context
 */
const ServiceContext = createContext<IServiceContainer | null>(null);

/**
 * Service provider props
 */
interface ServiceProviderProps {
  children: ReactNode;
  services?: IServiceContainer; // Allow custom services for testing
}

/**
 * Service provider component
 */
export function ServiceProvider({ children, services }: ServiceProviderProps) {
  const serviceContainer = services || ServiceContainer.getServices();

  return <ServiceContext.Provider value={serviceContainer}>{children}</ServiceContext.Provider>;
}

/**
 * Hook to use services
 */
export function useServices(): IServiceContainer {
  const services = useContext(ServiceContext);

  if (!services) {
    throw new Error("useServices must be used within a ServiceProvider");
  }

  return services;
}

/**
 * Hook to use profile manager
 */
export function useProfileManager() {
  const { profileManager } = useServices();
  return profileManager;
}

/**
 * Hook to use profile repository
 */
export function useProfileRepository() {
  const { profileRepository } = useServices();
  return profileRepository;
}

/**
 * Hook to use validation service
 */
export function useValidationService() {
  const { validationService } = useServices();
  return validationService;
}

/**
 * Hook to use configuration service
 */
export function useConfigurationService() {
  const { configurationService } = useServices();
  return configurationService;
}

/**
 * Hook to use notification service
 */
export function useNotificationService() {
  const { notificationService } = useServices();
  return notificationService;
}
