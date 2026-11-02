export class RequestSequence {
  private revision = 0;

  begin(): () => boolean {
    const revision = ++this.revision;
    return () => revision === this.revision;
  }

  invalidate(): void {
    this.revision++;
  }
}
