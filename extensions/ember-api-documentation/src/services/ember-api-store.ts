import DocumentationItem from "../entities/documentation-item";
import { EmberApiResponse } from "../interfaces/ember-api-response";
import emberApiResponse from "./../data/ember-4.7.0.json";
import emberDataApiResponse from "./../data/ember-data-4.7.2.json";

export default class EmberApiStore {
  parseData(data: EmberApiResponse, project: string, version: string): DocumentationItem[] {
    const relationships = data.data?.relationships;
    let entries = Object.entries(relationships || {});
    const array: DocumentationItem[] = [];

    entries = entries.filter(([type]) => {
      return type === "classes" || type === "modules" || type === "namespaces";
    });

    entries.forEach(([type, value]) => {
      const items = value.data;

      if (Array.isArray(items)) {
        items.forEach((item) => {
          let name = "";

          if (project === "Ember Data") {
            name = item.id.replace(/ember-data-\d.\d.\d-/, "");
          } else {
            name = item.id.replace(/ember-\d.\d.\d-/, "");
          }

          array.push(
            new DocumentationItem(
              name,
              this.capitalizeFirstLetter(type),
              project,
              this.buildUrl(name, type, project),
              version
            )
          );
        });
      }
    });

    return array;
  }

  capitalizeFirstLetter(string: string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
  }

  buildUrl(name: string, type: string, project: string): string {
    project = project.toLowerCase().replace(/ /g, "-");
    return `https://api.emberjs.com/${project}/release/${type}/${encodeURIComponent(name)}`;
  }

  getEmberDocumentation(): DocumentationItem[] {
    const ember = this.parseData(emberApiResponse as unknown as EmberApiResponse, "Ember", "v4.7.0");

    return ember.sort((a, b) => a.name.localeCompare(b.name));
  }

  getEmberDataDocumentation(): DocumentationItem[] {
    const emberData = this.parseData(emberDataApiResponse as unknown as EmberApiResponse, "Ember Data", "v4.7.2");

    return emberData.sort((a, b) => a.name.localeCompare(b.name));
  }
}
