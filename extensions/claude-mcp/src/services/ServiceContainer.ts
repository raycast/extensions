/**
 * Service container for dependency injection
 * Implements Dependency Inversion Principle by providing service instances
 */

import { IProfileRepository } from "./interfaces/IProfileRepository";
import { IValidationService } from "./interfaces/IValidationService";
import { IConfigurationService } from "./interfaces/IConfigurationService";
import { INotificationService } from "./interfaces/INotificationService";
import { IProfileManager } from "./interfaces/IProfileManager";

import { ProfileRepositoryService } from "./implementations/ProfileRepositoryService";
import { ValidationService } from "./implementations/ValidationService";
import { ConfigurationService } from "./implementations/ConfigurationService";
import { NotificationService } from "./implementations/NotificationService";
import { ProfileService } from "./implementations/ProfileService";

/**
 * Service container interface
 */
export interface IServiceContainer {
  profileRepository: IProfileRepository;
  validationService: IValidationService;
  configurationService: IConfigurationService;
  notificationService: INotificationService;
  profileManager: IProfileManager;
}

/**
 * Service factory for creating service instances
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: IServiceContainer | null = null;

  private constructor() {}

  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  createServices(): IServiceContainer {
    if (this.services) {
      return this.services;
    }

    // Create service instances with proper dependency injection
    const profileRepository = new ProfileRepositoryService();
    const configurationService = new ConfigurationService();
    const notificationService = new NotificationService();
    const validationService = new ValidationService(profileRepository);

    const profileManager = new ProfileService(
      profileRepository,
      validationService,
      configurationService,
      notificationService,
    );

    this.services = {
      profileRepository,
      validationService,
      configurationService,
      notificationService,
      profileManager,
    };

    return this.services;
  }

  resetServices(): void {
    this.services = null;
  }
}

/**
 * Service container singleton
 */
export class ServiceContainer {
  private static services: IServiceContainer | null = null;

  static getServices(): IServiceContainer {
    if (!ServiceContainer.services) {
      const factory = ServiceFactory.getInstance();
      ServiceContainer.services = factory.createServices();
    }
    return ServiceContainer.services;
  }

  static resetServices(): void {
    ServiceContainer.services = null;
    ServiceFactory.getInstance().resetServices();
  }

  // Individual service getters for convenience
  static getProfileRepository(): IProfileRepository {
    return ServiceContainer.getServices().profileRepository;
  }

  static getValidationService(): IValidationService {
    return ServiceContainer.getServices().validationService;
  }

  static getConfigurationService(): IConfigurationService {
    return ServiceContainer.getServices().configurationService;
  }

  static getNotificationService(): INotificationService {
    return ServiceContainer.getServices().notificationService;
  }

  static getProfileManager(): IProfileManager {
    return ServiceContainer.getServices().profileManager;
  }
}
