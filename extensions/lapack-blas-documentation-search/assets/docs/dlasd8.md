```fortran
subroutine dlasd8 (
        integer icompq,
        integer k,
        double precision, dimension( * ) d,
        double precision, dimension( * ) z,
        double precision, dimension( * ) vf,
        double precision, dimension( * ) vl,
        double precision, dimension( * ) difl,
        double precision, dimension( lddifr, * ) difr,
        integer lddifr,
        double precision, dimension( * ) dsigma,
        double precision, dimension( * ) work,
        integer info
)
```

DLASD8 finds the square roots of the roots of the secular equation,
as defined by the values in DSIGMA and Z. It makes the appropriate
calls to DLASD4, and stores, for each  element in D, the distance
to its two nearest poles (elements in DSIGMA). It also updates
the arrays VF and VL, the first and last components of all the
right singular vectors of the original bidiagonal matrix.

DLASD8 is called from DLASD6.

## Parameters
ICOMPQ : INTEGER [in]
> Specifies whether singular vectors are to be computed in
> factored form in the calling routine:
> = 0: Compute singular values only.
> = 1: Compute singular vectors in factored form as well.

K : INTEGER [in]
> The number of terms in the rational function to be solved
> by DLASD4.  K >= 1.

D : DOUBLE PRECISION array, dimension ( K ) [out]
> On output, D contains the updated singular values.

Z : DOUBLE PRECISION array, dimension ( K ) [in,out]
> On entry, the first K elements of this array contain the
> components of the deflation-adjusted updating row vector.
> On exit, Z is updated.

VF : DOUBLE PRECISION array, dimension ( K ) [in,out]
> On entry, VF contains  information passed through DBEDE8.
> On exit, VF contains the first K components of the first
> components of all right singular vectors of the bidiagonal
> matrix.

VL : DOUBLE PRECISION array, dimension ( K ) [in,out]
> On entry, VL contains  information passed through DBEDE8.
> On exit, VL contains the first K components of the last
> components of all right singular vectors of the bidiagonal
> matrix.

DIFL : DOUBLE PRECISION array, dimension ( K ) [out]
> On exit, DIFL(I) = D(I) - DSIGMA(I).

DIFR : DOUBLE PRECISION array, [out]
> dimension ( LDDIFR, 2 ) if ICOMPQ = 1 and
> dimension ( K ) if ICOMPQ = 0.
> On exit, DIFR(I,1) = D(I) - DSIGMA(I+1), DIFR(K,1) is not
> defined and will not be referenced.
> 
> If ICOMPQ = 1, DIFR(1:K,2) is an array containing the
> normalizing factors for the right singular vector matrix.

LDDIFR : INTEGER [in]
> The leading dimension of DIFR, must be at least K.

DSIGMA : DOUBLE PRECISION array, dimension ( K ) [in]
> On entry, the first K elements of this array contain the old
> roots of the deflated updating problem.  These are the poles
> of the secular equation.

WORK : DOUBLE PRECISION array, dimension (3\*K) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
