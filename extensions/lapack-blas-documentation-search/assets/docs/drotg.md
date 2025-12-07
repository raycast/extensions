```fortran
subroutine drotg (
        real(wp) a,
        real(wp) b,
        real(wp) c,
        real(wp) s
)
```

DROTG constructs a plane rotation
[  c  s ] [ a ] = [ r ]
[ -s  c ] [ b ]   [ 0 ]
satisfying c\*\*2 + s\*\*2 = 1.

The computation uses the formulas
sigma = sgn(a)    if |a| >  |b|
= sgn(b)    if |b| >= |a|
r = sigma\*sqrt( a\*\*2 + b\*\*2 )
c = 1; s = 0      if r = 0
c = a/r; s = b/r  if r != 0
The subroutine also computes
z = s    if |a| > |b|,
= 1/c  if |b| >= |a| and c != 0
= 1    if c = 0
This allows c and s to be reconstructed from z as follows:
If z = 1, set c = 0, s = 1.
If |z| < 1, set c = sqrt(1 - z\*\*2) and s = z.
If |z| > 1, set c = 1/z and s = sqrt( 1 - c\*\*2).

## Parameters
A : DOUBLE PRECISION [in,out]
> On entry, the scalar a.
> On exit, the scalar r.

B : DOUBLE PRECISION [in,out]
> On entry, the scalar b.
> On exit, the scalar z.

C : DOUBLE PRECISION [out]
> The scalar c.

S : DOUBLE PRECISION [out]
> The scalar s.
