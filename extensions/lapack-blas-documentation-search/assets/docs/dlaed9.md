```fortran
subroutine dlaed9 (
        integer k,
        integer kstart,
        integer kstop,
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision rho,
        double precision, dimension( * ) dlambda,
        double precision, dimension( * ) w,
        double precision, dimension( lds, * ) s,
        integer lds,
        integer info
)
```

DLAED9 finds the roots of the secular equation, as defined by the
values in D, Z, and RHO, between KSTART and KSTOP.  It makes the
appropriate calls to DLAED4 and then stores the new matrix of
eigenvectors for use in calculating the next level of Z vectors.

## Parameters
K : INTEGER [in]
> The number of terms in the rational function to be solved by
> DLAED4.  K >= 0.

KSTART : INTEGER [in]

KSTOP : INTEGER [in]
> The updated eigenvalues Lambda(I), KSTART <= I <= KSTOP
> are to be computed.  1 <= KSTART <= KSTOP <= K.

N : INTEGER [in]
> The number of rows and columns in the Q matrix.
> N >= K (delation may result in N > K).

D : DOUBLE PRECISION array, dimension (N) [out]
> D(I) contains the updated eigenvalues
> for KSTART <= I <= KSTOP.

Q : DOUBLE PRECISION array, dimension (LDQ,N) [out]

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max( 1, N ).

RHO : DOUBLE PRECISION [in]
> The value of the parameter in the rank one update equation.
> RHO >= 0 required.

DLAMBDA : DOUBLE PRECISION array, dimension (K) [in]
> The first K elements of this array contain the old roots
> of the deflated updating problem.  These are the poles
> of the secular equation.

W : DOUBLE PRECISION array, dimension (K) [in]
> The first K elements of this array contain the components
> of the deflation-adjusted updating vector.

S : DOUBLE PRECISION array, dimension (LDS, K) [out]
> Will contain the eigenvectors of the repaired matrix which
> will be stored for subsequent Z vector calculation and
> multiplied by the previously accumulated eigenvectors
> to update the system.

LDS : INTEGER [in]
> The leading dimension of S.  LDS >= max( 1, K ).

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, an eigenvalue did not converge
