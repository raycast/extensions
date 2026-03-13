```fortran
subroutine sstebz (
        character range,
        character order,
        integer n,
        real vl,
        real vu,
        integer il,
        integer iu,
        real abstol,
        real, dimension( * ) d,
        real, dimension( * ) e,
        integer m,
        integer nsplit,
        real, dimension( * ) w,
        integer, dimension( * ) iblock,
        integer, dimension( * ) isplit,
        real, dimension( * ) work,
        integer, dimension( * ) iwork,
        integer info
)
```

SSTEBZ computes the eigenvalues of a symmetric tridiagonal
matrix T.  The user may ask for all eigenvalues, all eigenvalues
in the half-open interval (VL, VU], or the IL-th through IU-th
eigenvalues.

To avoid overflow, the matrix must be scaled so that its
largest element is no greater than overflow\*\*(1/2) \* underflow\*\*(1/4) in absolute value, and for greatest
accuracy, it should not be much smaller than that.

See W. Kahan , Report CS41, Computer Science Dept., Stanford
University, July 21, 1966.

## Parameters
RANGE : CHARACTER\*1 [in]
> = 'A': ()   all eigenvalues will be found.
> = 'V': () all eigenvalues in the half-open interval
> (VL, VU] will be found.
> = 'I': () the IL-th through IU-th eigenvalues (of the
> entire matrix) will be found.

ORDER : CHARACTER\*1 [in]
> = 'B': () the eigenvalues will be grouped by
> split-off block (see IBLOCK, ISPLIT) and
> ordered from smallest to largest within
> the block.
> = 'E': ()
> the eigenvalues for the entire matrix
> will be ordered from smallest to
> largest.

N : INTEGER [in]
> The order of the tridiagonal matrix T.  N >= 0.

VL : REAL [in]
> 
> If RANGE='V', the lower bound of the interval to
> be searched for eigenvalues.  Eigenvalues less than or equal
> to VL, or greater than VU, will not be returned.  VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

VU : REAL [in]
> 
> If RANGE='V', the upper bound of the interval to
> be searched for eigenvalues.  Eigenvalues less than or equal
> to VL, or greater than VU, will not be returned.  VL < VU.
> Not referenced if RANGE = 'A' or 'I'.

IL : INTEGER [in]
> 
> If RANGE='I', the index of the
> smallest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

IU : INTEGER [in]
> 
> If RANGE='I', the index of the
> largest eigenvalue to be returned.
> 1 <= IL <= IU <= N, if N > 0; IL = 1 and IU = 0 if N = 0.
> Not referenced if RANGE = 'A' or 'V'.

ABSTOL : REAL [in]
> The absolute tolerance for the eigenvalues.  An eigenvalue
> (or cluster) is considered to be located if it has been
> determined to lie in an interval whose width is ABSTOL or
> less.  If ABSTOL is less than or equal to zero, then ULP\*|T|
> will be used, where |T| means the 1-norm of T.
> 
> Eigenvalues will be computed most accurately when ABSTOL is
> set to twice the underflow threshold 2\*SLAMCH('S'), not zero.

D : REAL array, dimension (N) [in]
> The n diagonal elements of the tridiagonal matrix T.

E : REAL array, dimension (N-1) [in]
> The (n-1) off-diagonal elements of the tridiagonal matrix T.

M : INTEGER [out]
> The actual number of eigenvalues found. 0 <= M <= N.
> (See also the description of INFO=2,3.)

NSPLIT : INTEGER [out]
> The number of diagonal blocks in the matrix T.
> 1 <= NSPLIT <= N.

W : REAL array, dimension (N) [out]
> On exit, the first M elements of W will contain the
> eigenvalues.  (SSTEBZ may use the remaining N-M elements as
> workspace.)

IBLOCK : INTEGER array, dimension (N) [out]
> At each row/column j where E(j) is zero or small, the
> matrix T is considered to split into a block diagonal
> matrix.  On exit, if INFO = 0, IBLOCK(i) specifies to which
> block (from 1 to the number of blocks) the eigenvalue W(i)
> belongs.  (SSTEBZ may use the remaining N-M elements as
> workspace.)

ISPLIT : INTEGER array, dimension (N) [out]
> The splitting points, at which T breaks up into submatrices.
> The first submatrix consists of rows/columns 1 to ISPLIT(1),
> the second of rows/columns ISPLIT(1)+1 through ISPLIT(2),
> etc., and the NSPLIT-th consists of rows/columns
> ISPLIT(NSPLIT-1)+1 through ISPLIT(NSPLIT)=N.
> (Only the first NSPLIT elements will actually be used, but
> since the user cannot know a priori what value NSPLIT will
> have, N words must be reserved for ISPLIT.)

WORK : REAL array, dimension (4\*N) [out]

IWORK : INTEGER array, dimension (3\*N) [out]

INFO : INTEGER [out]
> = 0:  successful exit
> < 0:  if INFO = -i, the i-th argument had an illegal value
> > 0:  some or all of the eigenvalues failed to converge or
> were not computed:
> =1 or 3: Bisection failed to converge for some
> eigenvalues; these eigenvalues are flagged by a
> negative block number.  The effect is that the
> eigenvalues may not be as accurate as the
> absolute and relative tolerances.  This is
> generally caused by unexpectedly inaccurate
> arithmetic.
> =2 or 3: RANGE='I' only: Not all of the eigenvalues
> IL:IU were found.
> Effect: M < IU+1-IL
> Cause:  non-monotonic arithmetic, causing the
> Sturm sequence to be non-monotonic.
> Cure:   recalculate, using RANGE='A', and pick
> out eigenvalues IL:IU.  In some cases,
> increasing the PARAMETER  may
> make things work.
> = 4:    RANGE='I', and the Gershgorin interval
> initially used was too small.  No eigenvalues
> were computed.
> Probable cause: your machine has sloppy
> floating-point arithmetic.
> Cure: Increase the PARAMETER ,
> recompile, and try again.
