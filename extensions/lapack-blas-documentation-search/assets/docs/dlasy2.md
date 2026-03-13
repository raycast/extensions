```fortran
subroutine dlasy2 (
        logical ltranl,
        logical ltranr,
        integer isgn,
        integer n1,
        integer n2,
        double precision, dimension( ldtl, * ) tl,
        integer ldtl,
        double precision, dimension( ldtr, * ) tr,
        integer ldtr,
        double precision, dimension( ldb, * ) b,
        integer ldb,
        double precision scale,
        double precision, dimension( ldx, * ) x,
        integer ldx,
        double precision xnorm,
        integer info
)
```

DLASY2 solves for the N1 by N2 matrix X, 1 <= N1,N2 <= 2, in

op(TL)\*X + ISGN\*X\*op(TR) = SCALE\*B,

where TL is N1 by N1, TR is N2 by N2, B is N1 by N2, and ISGN = 1 or
-1.  op(T) = T or T\*\*T, where T\*\*T denotes the transpose of T.

## Parameters
LTRANL : LOGICAL [in]
> On entry, LTRANL specifies the op(TL):
> = .FALSE., op(TL) = TL,
> = .TRUE., op(TL) = TL\*\*T.

LTRANR : LOGICAL [in]
> On entry, LTRANR specifies the op(TR):
> = .FALSE., op(TR) = TR,
> = .TRUE., op(TR) = TR\*\*T.

ISGN : INTEGER [in]
> On entry, ISGN specifies the sign of the equation
> as described before. ISGN may only be 1 or -1.

N1 : INTEGER [in]
> On entry, N1 specifies the order of matrix TL.
> N1 may only be 0, 1 or 2.

N2 : INTEGER [in]
> On entry, N2 specifies the order of matrix TR.
> N2 may only be 0, 1 or 2.

TL : DOUBLE PRECISION array, dimension (LDTL,2) [in]
> On entry, TL contains an N1 by N1 matrix.

LDTL : INTEGER [in]
> The leading dimension of the matrix TL. LDTL >= max(1,N1).

TR : DOUBLE PRECISION array, dimension (LDTR,2) [in]
> On entry, TR contains an N2 by N2 matrix.

LDTR : INTEGER [in]
> The leading dimension of the matrix TR. LDTR >= max(1,N2).

B : DOUBLE PRECISION array, dimension (LDB,2) [in]
> On entry, the N1 by N2 matrix B contains the right-hand
> side of the equation.

LDB : INTEGER [in]
> The leading dimension of the matrix B. LDB >= max(1,N1).

SCALE : DOUBLE PRECISION [out]
> On exit, SCALE contains the scale factor. SCALE is chosen
> less than or equal to 1 to prevent the solution overflowing.

X : DOUBLE PRECISION array, dimension (LDX,2) [out]
> On exit, X contains the N1 by N2 solution.

LDX : INTEGER [in]
> The leading dimension of the matrix X. LDX >= max(1,N1).

XNORM : DOUBLE PRECISION [out]
> On exit, XNORM is the infinity-norm of the solution.

INFO : INTEGER [out]
> On exit, INFO is set to
> 0: successful exit.
> 1: TL and TR have too close eigenvalues, so TL or
> TR is perturbed to get a nonsingular equation.
> NOTE: In the interests of speed, this routine does not
> check the inputs for errors.
