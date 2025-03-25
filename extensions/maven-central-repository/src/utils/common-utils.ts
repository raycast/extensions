import { Doc } from "./types";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export enum DependencyType {
  APACHE_MAVEN = "Apache Maven",
  GRADLE_GROOVY_DSL = "Gradle Groovy DSL",
  GRADLE_KOTLIN_DSL = "Gradle Kotlin DSL",
  SCALA_SBT = "Scala SBT",
  APACHE_IVY = "Apache Ivy",
  GROOVY_GRAPE = "Groovy Grape",
  LEININGEN = "Leiningen",
  APACHE_BUILDR = "Apache Buildr",
  MAVEN_CENTRAL_BADGE = "Maven Central Badge",
  PURL = "PURL",
}

export const dependencyTypes = Object.values(DependencyType);

export const actionIcons = [
  "action-icon/apache-maven.png",
  "action-icon/gradle-groovy-dsl.png",
  "action-icon/gradle-kotlin-dsl.png",
  "action-icon/scala-sbt.png",
  "action-icon/groovy-grape.png",
  "action-icon/apache-ivy.png",
  "action-icon/leiningen.png",
  "action-icon/apache-buildr.png",
  "action-icon/maven-central-badge.png",
  "action-icon/purl.png",
];

export const buildDependency = (doc: Doc, dependenceType: DependencyType) => {
  switch (dependenceType) {
    case DependencyType.APACHE_MAVEN: {
      return `<dependency>
  <groupId>${doc.g}</groupId>
  <artifactId>${doc.a}</artifactId>
  <version>${doc.latestVersion}</version>
  <type>${doc.p}</type>
</dependency>`;
    }
    case DependencyType.GRADLE_GROOVY_DSL: {
      return `implementation '${doc.g}:${doc.a}:${doc.latestVersion}'`;
    }
    case DependencyType.GRADLE_KOTLIN_DSL: {
      return `implementation("${doc.g}:${doc.a}:${doc.latestVersion}")`;
    }
    case DependencyType.SCALA_SBT: {
      return `libraryDependencies += "${doc.g}" % "${doc.a}" % "${doc.latestVersion}"`;
    }
    case DependencyType.APACHE_IVY: {
      return `<dependency org="${doc.g}" name="${doc.a}" rev="${doc.latestVersion}" />`;
    }
    case DependencyType.GROOVY_GRAPE: {
      return `@Grapes(
  @Grab(group='${doc.g}', module='${doc.a}', version='${doc.latestVersion}')
)`;
    }
    case DependencyType.LEININGEN: {
      return `[${doc.g}/${doc.a} "${doc.latestVersion}"]`;
    }
    case DependencyType.APACHE_BUILDR: {
      return `'${doc.g}:${doc.a}:jar:${doc.latestVersion}'`;
    }
    case DependencyType.MAVEN_CENTRAL_BADGE: {
      return `[![Maven Central](https://img.shields.io/maven-central/v/${doc.g}/${doc.a}.svg?label=Maven%20Central)](https://search.maven.org/search?q=g:%22${doc.g}%22%20AND%20a:%22${doc.a}%22)`;
    }
    case DependencyType.PURL: {
      return `pkg:maven/${doc.g}/${doc.a}@${doc.latestVersion}`;
    }
  }
};
