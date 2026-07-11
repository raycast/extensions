```fortran
subroutine dlaed3 (
        integer k,
        integer n,
        integer n1,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        double precision rho,
        double precision, dimension( * ) dlambda,
        double precision, dimension( * ) q2,
        integer, dimension( * ) indx,
        integer, dimension( * ) ctot,
        double precision, dimension( * ) w,
        double precision, dimension( * ) s,
        integer info
)
```

DLAED3 finds the roots of the secular equation, as defined by the
values in D, W, and RHO, between 1 and K.  It makes the
appropriate calls to DLAED4 and then updates the eigenvectors by
multiplying the matrix of eigenvectors of the pair of eigensystems
being combined by the matrix of eigenvectors of the K-by-K system
which is solved here.

## Parameters
K : INTEGER [in]
> The number of terms in the rational function to be solved by
> DLAED4.  K >= 0.

N : INTEGER [in]
> The number of rows and columns in the Q matrix.
> N >= K (deflation may result in N>K).

N1 : INTEGER [in]
> The location of the last eigenvalue in the leading submatrix.
> min(1,N) <= N1 <= N/2.

D : DOUBLE PRECISION array, dimension (N) [out]
> D(I) contains the updated eigenvalues for
> 1 <= I <= K.

Q : DOUBLE PRECISION array, dimension (LDQ,N) [out]
> Initially the first K columns are used as workspace.
> On output the columns 1 to K contain
> the updated eigenvectors.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

RHO : DOUBLE PRECISION [in]
> The value of the parameter in the rank one update equation.
> RHO >= 0 required.

DLAMBDA : DOUBLE PRECISION array, dimension (K) [in]
> The first K elements of this array contain the old roots
> of the deflated updating problem.  These are the poles
> of the secular equation.

Q2 : DOUBLE PRECISION array, dimension (LDQ2\*N) [in]
> The first K columns of this matrix contain the non-deflated
> eigenvectors for the split problem.

INDX : INTEGER array, dimension (N) [in]
> The permutation used to arrange the columns of the deflated
> Q matrix into three groups (see DLAED2).
> The rows of the eigenvectors found by DLAED4 must be likewise
> permuted before the matrix multiply can take place.

CTOT : INTEGER array, dimension (4) [in]
> A count of the total number of the various types of columns
> in Q, as described in INDX.  The fourth column type is any
> column which has been deflated.

W : DOUBLE PRECISION array, dimension (K) [in,out]
> The first K elements of this array contain the components
> of the deflation-adjusted updating vector. Destroyed on
> output.

S : DOUBLE PRECISION array, dimension (N1 + 1)\*K [out]
> Will contain the eigenvectors of the repaired matrix which
> will be multiplied by the previously accumulated eigenvectors
> to update the system.

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, an eigenvalue did not converge
