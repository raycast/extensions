```fortran
subroutine zrotg (
        complex(wp) a,
        complex(wp) b,
        real(wp) c,
        complex(wp) s
)
```

ZROTG constructs a plane rotation
[  c         s ] [ a ] = [ r ]
[ -conjg(s)  c ] [ b ]   [ 0 ]
where c is real, s is complex, and c\*\*2 + conjg(s)\*s = 1.

The computation uses the formulas
|x| = sqrt( Re(x)\*\*2 + Im(x)\*\*2 )
sgn(x) = x / |x|  if x /= 0
= 1        if x  = 0
c = |a| / sqrt(|a|\*\*2 + |b|\*\*2)
s = sgn(a) \* conjg(b) / sqrt(|a|\*\*2 + |b|\*\*2)
r = sgn(a)\*sqrt(|a|\*\*2 + |b|\*\*2)
When a and b are real and r /= 0, the formulas simplify to
c = a / r
s = b / r
the same as in DROTG when |a| > |b|.  When |b| >= |a|, the
sign of c and s will be different from those computed by DROTG
if the signs of a and b are not the same.

## Parameters
A : DOUBLE COMPLEX [in,out]
> On entry, the scalar a.
> On exit, the scalar r.

B : DOUBLE COMPLEX [in]
> The scalar b.

C : DOUBLE PRECISION [out]
> The scalar c.

S : DOUBLE COMPLEX [out]
> The scalar s.
