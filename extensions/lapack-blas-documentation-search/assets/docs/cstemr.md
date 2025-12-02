```fortran
subroutine cstemr (
        character jobz,
        character range,
        integer n,
        real, dimension( * ) d,
        real, dimension( * ) e,
        real vl,
        real vu,
        integer il,
        integer iu,
        integer m,
        real, dimension( * ) w,
        complex, dimension( ldz, * ) z,
        integer ldz,
        integer nzc,
        integer, dimension( * ) isuppz,
        logical tryrac,
        real, dimension( * ) work,
        integer lwork,
        integer, dimension( * ) iwork,
        integer liwork,
        integer info
)
```

CSTEMR computes selected eigenvalues and, optionally, eigenvectors
of a real symmetric tridiagonal matrix T. Any such unreduced matrix has
a well defined set of pairwise different real eigenvalues, the corresponding
real eigenvectors are pairwise orthogonal.

The spectrum may be computed either completely or partially by specifying
either an interval (VL,VU] or a range of indices IL:IU for the desired
eigenvalues.

Depending on the number of desired eigenvalues, these are computed either
by bisection or the dqds algorithm. Numerically orthogonal eigenvectors are
computed by the use of various suitable L D L^T factorizations near clusters
of close eigenvalues (referred to as RRRs, Relatively Robust
Representations). An informal sketch of the algorithm follows.

For each unreduced block (submatrix) of T,
(a) Compute T - sigma I  = L D L^T, so that L and D
define all the wanted eigenvalues to high relative accuracy.
This means that small relative changes in the entries of D and L
cause only small relative changes in the eigenvalues and
eigenvectors. The standard (unfactored) representation of the
tridiagonal matrix T does not have this property in general.
(b) Compute the eigenvalues to suitable accuracy.
If the eigenvectors are desired, the algorithm attains full
accuracy of the computed eigenvalues only right before
the corresponding vectors have to be computed, see steps c) and d).
(c) For each cluster of close eigenvalues, select a new
shift close to the cluster, find a new factorization, and refine
the shifted eigenvalues to suitable accuracy.
(d) For each eigenvalue with a large enough relative separation compute
the corresponding eigenvector by forming a rank revealing twisted
factorization. Go back to (c) for any clusters that remain.

For more details, see:
- Inderjit S. Dhillon and Beresford N. Parlett:
Linear Algebra and its Applications, 387(1), pp. 1-28, August 2004.
- Inderjit Dhillon and Beresford Parlett:  SIAM Journal on Matrix Analysis and Applications, Vol. 25,
2004.  Also LAPACK Working Note 154.
- Inderjit Dhillon: ,
Computer Science Division Technical Report No. UCB/CSD-97-971,
UC Berkeley, May 1997.

Further Details
1.CSTEMR works only on machines which follow IEEE-754
floating-point standard in their handling of infinities and NaNs.
This permits the use of efficient inner loops avoiding a check for
zero divisors.

2. LAPACK routines can be used to reduce a complex Hermitean matrix to
real symmetric tridiagonal form.

(Any complex Hermitean tridiagonal matrix has real values on its diagonal
and potentially complex numbers on its off-diagonals. By applying a
similarity transform with an appropriate diagonal matrix
diag(1,e^{i \phy_1}, ... , e^{i \phy_{n-1}}), the complex Hermitean
matrix can be transformed into a real symmetric matrix and complex
arithmetic can be entirely avoided.)

While the eigenvectors of the real symmetric tridiagonal matrix are real,
the eigenvectors of original complex Hermitean matrix have complex entries
in general.
Since LAPACK drivers overwrite the matrix data with the eigenvectors,
CSTEMR accepts complex workspace to facilitate interoperability
with CUNMTR or CUPMTR.

## Parameters
JOBZ : CHARACTER\*1 [in]
> = 'N':  Compute eigenvalues only;
> = 'V':  Compute eigenvalues and eigenvectors.

RANGE : CHARACTER\*1 [in]
> = 'A': all eigenvalues will be found.
> = 'V': all eigenvalues in the half-open interval (VL,VU]
> will be found.
> = 'I': the IL-th through IU-th eigenvalues will be found.

N : INTEGER [in]
> The order of the matrix.  N >= 0.

D : REAL array, dimension (N) [in,out]
> On entry, the N diagonal elements of the tridiagonal matrix
> T. On exit, D is overwritten.

E : REAL array, dimension (N) [in,out]
> On entry, the (N-1) subdiagonal elements of the tridiagonal
> matrix T in elements 1 to N-1 of E. E(N) need not be set on
> input, but is used internally as workspace.
> On exit, E is overwritten.

VL : REAL [in]
> 
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : REAL [in]
> 
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues. VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> 
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> 
> If RANGE='I', the index of the
> largest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0.
> Not referenced if RANGE = 'A' or 'V'.

M : INTEGER [out]
> The total number of eigenvalues found.  0 <= M <= N.
> If RANGE = 'A', M = N, and if RANGE = 'I', M = IU-IL+1.

W : REAL array, dimension (N) [out]
> The first M elements contain the selected eigenvalues in
> ascending order.

Z : COMPLEX array, dimension (LDZ, max(1,M) ) [out]
> If JOBZ = 'V', and if INFO = 0, then the first M columns of Z
> contain the orthonormal eigenvectors of the matrix T
> corresponding to the selected eigenvalues, with the i-th
> column of Z holding the eigenvector associated with W(i).
> If JOBZ = 'N', then Z is not referenced.
> Note: the user must ensure that at least max(1,M) columns are
> supplied in the array Z; if RANGE = 'V', the exact value of M
> is not known in advance and can be computed with a workspace
> query by setting NZC = -1, see below.

LDZ : INTEGER [in]
> The leading dimension of the array Z.  LDZ >= 1, and if
> JOBZ = 'V', then LDZ >= max(1,N).

NZC : INTEGER [in]
> The number of eigenvectors to be held in the array Z.
> If RANGE = 'A', then NZC >= max(1,N).
> If RANGE = 'V', then NZC >= the number of eigenvalues in (VL,VU].
> If RANGE = 'I', then NZC >= IU-IL+1.
> If NZC = -1, then a workspace query is assumed; the
> routine calculates the number of columns of the array Z that
> are needed to hold the eigenvectors.
> This value is returned as the first entry of the Z array, and
> no error message related to NZC is issued by XERBLA.

ISUPPZ : INTEGER array, dimension ( 2\*max(1,M) ) [out]
> The support of the eigenvectors in Z, i.e., the indices
> indicating the nonzero elements in Z. The i-th computed eigenvector
> is nonzero only in elements ISUPPZ( 2\*i-1 ) through
> ISUPPZ( 2\*i ). This is relevant in the case when the matrix
> is split. ISUPPZ is only accessed when JOBZ is 'V' and N > 0.

TRYRAC : LOGICAL [in,out]
> If TRYRAC = .TRUE., indicates that the code should check whether
> the tridiagonal matrix defines its eigenvalues to high relative
> accuracy.  If so, the code uses relative-accuracy preserving
> algorithms that might be (a bit) slower depending on the matrix.
> If the matrix does not define its eigenvalues to high relative
> accuracy, the code can uses possibly faster algorithms.
> If TRYRAC = .FALSE., the code is not required to guarantee
> relatively accurate eigenvalues and can use the fastest possible
> techniques.
> On exit, a .TRUE. TRYRAC will be set to .FALSE. if the matrix
> does not define its eigenvalues to high relative accuracy.

WORK : REAL array, dimension (LWORK) [out]
> On exit, if INFO = 0, WORK(1) returns the optimal
> (and minimal) LWORK.

LWORK : INTEGER [in]
> The dimension of the array WORK. LWORK >= max(1,18\*N)
> if JOBZ = 'V', and LWORK >= max(1,12\*N) if JOBZ = 'N'.
> If LWORK = -1, then a workspace query is assumed; the routine
> only calculates the optimal size of the WORK array, returns
> this value as the first entry of the WORK array, and no error
> message related to LWORK is issued by XERBLA.

IWORK : INTEGER array, dimension (LIWORK) [out]
> On exit, if INFO = 0, IWORK(1) returns the optimal LIWORK.

LIWORK : INTEGER [in]
> The dimension of the array IWORK.  LIWORK >= max(1,10\*N)
> if the eigenvectors are desired, and LIWORK >= max(1,8\*N)
> if only the eigenvalues are to be computed.
> If LIWORK = -1, then a workspace query is assumed; the
> routine only calculates the optimal size of the IWORK array,
> returns this value as the first entry of the IWORK array, and
> no error message related to LIWORK is issued by XERBLA.

INFO : INTEGER [out]
> On exit, INFO
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  if INFO = 1X, internal error in SLARRE,
> if INFO = 2X, internal error in CLARRV.
> Here, the digit X = ABS( IINFO ) < 10, where IINFO is
> the nonzero error code returned by SLARRE or
> CLARRV, respectively.
