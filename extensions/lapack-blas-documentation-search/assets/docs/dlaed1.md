```fortran
subroutine dlaed1 (
        integer n,
        double precision, dimension( * ) d,
        double precision, dimension( ldq, * ) q,
        integer ldq,
        integer, dimension( * ) indxq,
        double precision rho,
        integer cutpnt,
        double precision, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

DLAED1 computes the updated eigensystem of a diagonal
matrix after modification by a rank-one symmetric matrix.  This
routine is used only for the eigenproblem which requires all
eigenvalues and eigenvectors of a tridiagonal matrix.  DLAED7 handles
the case in which eigenvalues only or eigenvalues and eigenvectors
of a full symmetric matrix (which was reduced to tridiagonal form)
are desired.

T = Q(in) ( D(in) + RHO \* Z\*Z\*\*T ) Q\*\*T(in) = Q(out) \* D(out) \* Q\*\*T(out)

where Z = Q\*\*T\*u, u is a vector of length N with ones in the
CUTPNT and CUTPNT + 1 th elements and zeros elsewhere.

The eigenvectors of the original matrix are stored in Q, and the
eigenvalues are in D.  The algorithm consists of three stages:

The first stage consists of deflating the size of the problem
when there are multiple eigenvalues or if there is a zero in
the Z vector.  For each such occurrence the dimension of the
secular equation problem is reduced by one.  This stage is
performed by the routine DLAED2.

The second stage consists of calculating the updated
eigenvalues. This is done by finding the roots of the secular
equation via the routine DLAED4 (as called by DLAED3).
This routine also calculates the eigenvectors of the current
problem.

The final stage consists of computing the updated eigenvectors
directly using the updated eigenvalues.  The eigenvectors for
the current problem are multiplied with the eigenvectors from
the overall problem.

## Parameters
N : INTEGER [in]
> The dimension of the symmetric tridiagonal matrix.  N >= 0.

D : DOUBLE PRECISION array, dimension (N) [in,out]
> On entry, the eigenvalues of the rank-1-perturbed matrix.
> On exit, the eigenvalues of the repaired matrix.

Q : DOUBLE PRECISION array, dimension (LDQ,N) [in,out]
> On entry, the eigenvectors of the rank-1-perturbed matrix.
> On exit, the eigenvectors of the repaired tridiagonal matrix.

LDQ : INTEGER [in]
> The leading dimension of the array Q.  LDQ >= max(1,N).

INDXQ : INTEGER array, dimension (N) [in,out]
> On entry, the permutation which separately sorts the two
> subproblems in D into ascending order.
> On exit, the permutation which will reintegrate the
> subproblems back into sorted order,
> i.e. D( INDXQ( I = 1, N ) ) will be in ascending order.

RHO : DOUBLE PRECISION [in]
> The subdiagonal entry used to create the rank-1 modification.

CUTPNT : INTEGER [in]
> The location of the last eigenvalue in the leading sub-matrix.
> min(1,N) <= CUTPNT <= N/2.

WORK : DOUBLE PRECISION array, dimension (4\*N + N\*\*2) [out]

IWORK : INTEGER array, dimension (4\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit.
> < 0:  if INFO = -i, the i-th argument had an illegal value.
> > 0:  if INFO = 1, an eigenvalue did not converge
