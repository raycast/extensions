```fortran
subroutine dlasd3 (
        integer nl,
        integer nr,
        integer sqre,
        integer k,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision, dimension( * ) dsigma,
        double precision, dimension( ldu, * ) u,
        integer ldu,
        double precision, dimension( ldu2, * ) u2,
        integer ldu2,
        double precision, dimension( ldvt, * ) vt,
        integer ldvt,
        double precision, dimension( ldvt2, * ) vt2,
        integer ldvt2,
        integer, dimension( * ) idxc,
        integer, dimension( * ) ctot,
        double precision, dimension( * ) z,
        integer info
)
```

DLASD3 finds all the square roots of the roots of the secular
equation, as defined by the values in D and Z.  It makes the
appropriate calls to DLASD4 and then updates the singular
vectors by matrix multiplication.

DLASD3 is called from DLASD1.

## Parameters
NL : INTEGER [in]
> The row dimension of the upper block.  NL >= 1.

NR : INTEGER [in]
> The row dimension of the lower block.  NR >= 1.

SQRE : INTEGER [in]
> = 0: the lower block is an NR-by-NR square matrix.
> = 1: the lower block is an NR-by-(NR+1) rectangular matrix.
> 
> The bidiagonal matrix has N = NL + NR + 1 rows and
> M = N + SQRE >= N columns.

K : INTEGER [in]
> The size of the secular equation, 1 =< K = < N.

D : DOUBLE PRECISION array, dimension(K) [out]
> On exit the square roots of the roots of the secular equation,
> in ascending order.

Q : DOUBLE PRECISION array, dimension (LDQ,K) [out]

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= K.

DSIGMA : DOUBLE PRECISION array, dimension(K) [in]
> The first K elements of this array contain the old roots
> of the deflated updating problem.  These are the poles
> of the secular equation.

U : DOUBLE PRECISION array, dimension (LDU, N) [out]
> The last N - K columns of this matrix contain the deflated
> left singular vectors.

LDU : INTEGER [in]
> The leading dimension of the array U.  LDU >= N.

U2 : DOUBLE PRECISION array, dimension (LDU2, N) [in]
> The first K columns of this matrix contain the non-deflated
> left singular vectors for the split problem.

LDU2 : INTEGER [in]
> The leading dimension of the array U2.  LDU2 >= N.

VT : DOUBLE PRECISION array, dimension (LDVT, M) [out]
> The last M - K columns of VT\*\*T contain the deflated
> right singular vectors.

LDVT : INTEGER [in]
> The leading dimension of the array VT.  LDVT >= N.

VT2 : DOUBLE PRECISION array, dimension (LDVT2, N) [in,out]
> The first K columns of VT2\*\*T contain the non-deflated
> right singular vectors for the split problem.

LDVT2 : INTEGER [in]
> The leading dimension of the array VT2.  LDVT2 >= N.

IDXC : INTEGER array, dimension ( N ) [in]
> The permutation used to arrange the columns of U (and rows of
> VT) into three groups:  the first group contains non-zero
> entries only at and above (or before) NL +1; the second
> contains non-zero entries only at and below (or after) NL+2;
> and the third is dense. The first column of U and the row of
> VT are treated separately, however.
> 
> The rows of the singular vectors found by DLASD4
> must be likewise permuted before the matrix multiplies can
> take place.

CTOT : INTEGER array, dimension ( 4 ) [in]
> A count of the total number of the various types of columns
> in U (or rows in VT), as described in IDXC. The fourth column
> type is any column which has been deflated.

Z : DOUBLE PRECISION array, dimension (K) [in,out]
> The first K elements of this array contain the components
> of the deflation-adjusted updating row vector.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, a singular value did not converge
